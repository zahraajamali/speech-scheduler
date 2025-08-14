import os, subprocess, datetime, json, re
from openai import OpenAI
from dotenv import load_dotenv

# ---------- LOAD ENV VARIABLES ----------
load_dotenv()  # Reads .env in current folder

# ---------- CONFIG ----------
PIPER_BIN = "piper"  # OHF Piper CLI (venv/bin/piper). Must be on PATH or absolute.

# Voices in local ./voices folder (UNCHANGED — uses your current quality files)
VOICE_DIR = os.path.join(os.path.dirname(__file__), "voices")
VOICES = {
    "en": {
        "female": os.path.join(VOICE_DIR, "en_US-amy-low.onnx"),
        "male":   os.path.join(VOICE_DIR, "en_GB-alan-low.onnx"),
    },
    "es": {
        "female": os.path.join(VOICE_DIR, "es_ES-mls_10246-low.onnx"),
        "male":   os.path.join(VOICE_DIR, "es_ES-carlfm-low.onnx"),
    },
    "ca": {
        "female": os.path.join(VOICE_DIR, "ca_ES-upc_ona-x_low.onnx"),
        "male":   os.path.join(VOICE_DIR, "ca_ES-upc_pau-x_low.onnx"),
    },
    "fa": {
        "female": os.path.join(VOICE_DIR, "ca_ES-upc_ona-x_low.onnx"),
        "male":   os.path.join(VOICE_DIR, "fa_IR-amir-medium.onnx"),
    },
}

OPENAI_MODEL = "gpt-4o-mini"

SYSTEM_RULES = """You are an announcement copywriter.
- Return a SHORT, polished announcement: max 2 sentences.
- Respect the requested style: friendly | formal | urgent | custom.
- Write the announcement in the requested language (en, es,ca or fa).
- Be inclusive and appropriate; avoid targeting protected traits (age, gender, etc.).
- If the request is unsafe/inappropriate, transform it into a safe, inclusive announcement.
- Output ONLY the announcement text, no quotes, no preface.
"""

# ---------- TEXT HELPERS ----------
def rewrite_to_announcement(user_text: str, style: str, custom_style: str | None, language: str) -> str:
    style_note = {
        "friendly": "Warm, welcoming, upbeat.",
        "formal": "Polite, concise, professional.",
        "urgent": "Direct, time-sensitive, clear call-to-action.",
        "custom": custom_style or "Clear, neutral tone."
    }.get(style, "Clear, neutral tone.")

    prompt = f"""LANGUAGE: {language}
STYLE: {style_note}
User request:
{user_text}"""

    client = OpenAI()
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_RULES},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content.strip()

def postprocess_style(text: str, style: str) -> str:
    """
    Small, speech-friendly tweaks without changing meaning.
    """
    t = text.strip()

    # Ensure sentence-ending punctuation
    if not re.search(r"[.!?]$", t):
        t += "."

    # Replace symbols that hurt prosody
    t = t.replace(" & ", " and ")

    # Slightly stronger pause after colon
    t = re.sub(r":\s+", ": — ", t)

    # Style polish
    if style == "urgent" and not t.endswith(("!", ".")):
        t += "!"
    if style == "friendly" and t.endswith("!"):
        t = t[:-1] + "."

    return t

# ---------- SYNTHESIS ----------
def synthesize_with_piper(
    text: str,
    language: str,
    gender: str,
    out_path: str,
    *,
    length_scale: float = 1.0,      # < 1.0 faster, > 1.0 slower
    noise_scale: float = 0.5,       # lower = cleaner/stabler, higher = breathier
    noise_w: float = 0.5,           # additional noise shaping
    sentence_silence: float = 0.25, # pause between sentences (seconds)
    speaker: int | None = None,     # for multi-speaker models (optional)
    extra_args: list[str] | None = None
) -> str:
    voice_path = VOICES.get(language.lower(), {}).get(gender.lower())
    if not voice_path or not os.path.exists(voice_path):
        raise RuntimeError(f"Missing voice for language='{language}' gender='{gender}' at {voice_path}")

    cmd = [
        PIPER_BIN, "-m", voice_path, "-f", out_path, "-q",
        "--length_scale", str(length_scale),
        "--noise_scale", str(noise_scale),
        "--noise_w", str(noise_w),
        "--sentence_silence", str(sentence_silence),
    ]
    if speaker is not None:
        cmd += ["--speaker", str(speaker)]
    if extra_args:
        cmd += list(map(str, extra_args))
    cmd += ["--", text]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Piper error: {proc.stderr}")
    return out_path

# ---------- MASTERING ----------
def master_wav(in_path: str, out_path: str) -> str:
    """
    Light mastering to improve clarity and loudness using ffmpeg.
    - loudnorm: consistent perceived loudness
    - highpass/lowpass: gentle tone shaping
    - silenceremove: trims dead air
    """
    cmd = [
        "ffmpeg", "-y", "-i", in_path,
        "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11,"
        "highpass=f=80,"
        "lowpass=f=12000,"
        "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.3:detection=peak,"
        "aformat=sample_fmts=s16:sample_rates=48000",
        out_path
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg mastering error: {proc.stderr}")
    return out_path

def export_variants(wav_path: str, formats: list[str]) -> dict[str, str]:
    """
    Optional convenience: transcode the mastered WAV to additional formats.
    Supported keys in `formats`: 'm4a', 'mp3', 'opus'
    """
    outputs: dict[str, str] = {}
    for fmt in formats:
        fmt = fmt.lower()
        if fmt == "m4a":
            out_path = wav_path.replace(".wav", ".m4a")
            args = ["-c:a", "aac", "-b:a", "192k"]
        elif fmt == "mp3":
            out_path = wav_path.replace(".wav", ".mp3")
            args = ["-c:a", "libmp3lame", "-q:a", "2"]
        elif fmt == "opus":
            out_path = wav_path.replace(".wav", ".opus")
            args = ["-c:a", "libopus", "-b:a", "96k"]
        else:
            continue

        proc = subprocess.run(["ffmpeg", "-y", "-i", wav_path, *args, out_path],
                              capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg export error ({fmt}): {proc.stderr}")
        outputs[fmt] = out_path
    return outputs

# ---------- PIPELINE ----------
def style_presets(style: str) -> dict:
    """
    Sensible per-style defaults that work well with many Piper voices.
    Keeping your existing voice quality; just shaping prosody/pauses.
    """
    s = style.lower()
    if s == "urgent":
        return dict(length_scale=0.94, noise_scale=0.55, noise_w=0.6, sentence_silence=0.22)
    if s == "formal":
        return dict(length_scale=1.08, noise_scale=0.40, noise_w=0.50, sentence_silence=0.30)
    if s == "friendly":
        return dict(length_scale=1.02, noise_scale=0.45, noise_w=0.50, sentence_silence=0.32)
    # default / custom
    return dict(length_scale=1.00, noise_scale=0.50, noise_w=0.50, sentence_silence=0.28)

def make_announcement(user_text: str, language: str, gender: str, style: str,
                      custom_style: str | None = None,
                      master: bool = True,
                      export_formats: list[str] | None = None):
    draft = rewrite_to_announcement(user_text, style, custom_style, language)
    final_text = postprocess_style(draft, style)

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_file = f"raw_{language}_{style}_{gender}_{ts}.wav"
    out_file = f"announcement_{language}_{style}_{gender}_{ts}.wav"

    # Apply speaking-style presets (no change to voice file quality)
    preset = style_presets(style)

    synthesize_with_piper(
        final_text, language, gender, raw_file,
        length_scale=preset["length_scale"],
        noise_scale=preset["noise_scale"],
        noise_w=preset["noise_w"],
        sentence_silence=preset["sentence_silence"]
    )

    if master:
        master_wav(raw_file, out_file)
        try:
            os.remove(raw_file)
        except OSError:
            pass
        main_audio = out_file
    else:
        main_audio = raw_file

    extras = {}
    if export_formats:
        extras = export_variants(main_audio, export_formats)

    return final_text, main_audio, extras

# ---------- MAIN ----------
if __name__ == "__main__":
    # input.json can include optional knobs:
    # {
    #   "text": "...", "lang": "en", "gender": "female", "style": "friendly",
    #   "custom_style": null,
    #   "master": true,
    #   "export_formats": ["m4a","mp3"]   # optional
    # }
    with open("input.json", "r", encoding="utf-8") as f:
        cfg = json.load(f)

    txt, main_wav, extras = make_announcement(
        cfg["text"],
        cfg["lang"],
        cfg["gender"],
        cfg["style"],
        cfg.get("custom_style"),
        master=cfg.get("master", True),
        export_formats=cfg.get("export_formats")
    )

    print("Announcement:\n", txt)
    print("Saved audio ->", main_wav)
    if extras:
        for k, v in extras.items():
            print(f"Exported {k} -> {v}")
