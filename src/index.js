#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- CONFIG ----------
const PIPER_BIN = process.env.PIPER_BIN || "piper";

const POSSIBLE_VOICE_DIRS = [
  process.env.VOICES_DIR,
  path.join(process.cwd(), "voices"),
  path.join(__dirname, "..", "voices"),
  path.join(process.env.HOME || "~", ".piper", "voices"),
].filter(Boolean);

function findVoicesDir() {
  for (const dir of POSSIBLE_VOICE_DIRS) {
    if (fs.existsSync(dir)) return dir;
  }
  const defaultDir = path.join(process.cwd(), "voices");
  fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

const VOICE_DIR = findVoicesDir();

const VOICES = {
  en: {
    female: path.join(VOICE_DIR, "en_GB-jenny_dioco-medium.onnx"),
    male: path.join(VOICE_DIR, "en_GB-alan-low.onnx"),
  },
  es: {
    female: path.join(VOICE_DIR, "es_ES-mls_10246-low.onnx"),
    male: path.join(VOICE_DIR, "es_ES-carlfm-x_low.onnx"),
  },
  ca: {
    female: path.join(VOICE_DIR, "ca_ES-upc_ona-x_low.onnx"),
    male: path.join(VOICE_DIR, "ca_ES-upc_pau-x_low.onnx"),
  },
};

const OPENAI_MODEL = "gpt-4o-mini";

const SYSTEM_RULES = `You are an announcement copywriter.
- Return a SHORT, polished announcement: max 2 sentences.
- Respect the requested style: friendly | formal | urgent | custom.
- Write the announcement in the requested language (en, es,ca or fa).
- Be inclusive and appropriate; avoid targeting protected traits (age, gender, etc.).
- If the request is unsafe/inappropriate, transform it into a safe, inclusive announcement.
- Output ONLY the announcement text, no quotes, no preface.
`;

// ---------- TEXT HELPERS ----------
function styleNote(style, customStyle) {
  const map = {
    friendly: "Warm, welcoming, upbeat.",
    formal: "Polite, concise, professional.",
    urgent: "Direct, time-sensitive, clear call-to-action.",
    custom: customStyle || "Clear, neutral tone.",
  };
  return map[style] || "Clear, neutral tone.";
}

async function rewriteToAnnouncement(userText, style, customStyle, language) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `LANGUAGE: ${language}
STYLE: ${styleNote(style, customStyle)}
User request:
${userText}`;

  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_RULES },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  return (resp.choices?.[0]?.message?.content || "").trim();
}

function postprocessStyle(text, style) {
  let t = (text || "").trim();
  if (!/[.!?]$/.test(t)) t += ".";
  t = t.replace(/ & /g, " and ");
  t = t.replace(/:\s+/g, ": — ");

  if (style === "urgent" && !/[!.]$/.test(t)) t += "!";
  if (style === "friendly" && t.endsWith("!")) t = t.slice(0, -1) + ".";
  return t;
}

// ---------- SYNTHESIS ----------
function synthesizeWithPiper({
  text,
  language,
  gender,
  outPath,
  length_scale = 1.0,
  noise_scale = 0.5,
  noise_w = 0.5,
  sentence_silence = 0.25,
  speaker = null,
  extra_args = [],
}) {
  const voicePath = VOICES[language?.toLowerCase()]?.[gender?.toLowerCase()];
  if (!voicePath || !fs.existsSync(voicePath)) {
    throw new Error(
      `Missing voice for language='${language}' gender='${gender}' at ${voicePath}\n\n` +
        `💡 Run 'npm run setup-voices' to download voice models, or set VOICES_DIR environment variable.`
    );
  }

  const args = [
    "-m",
    voicePath,
    "-f",
    outPath,
    "-q",
    "--length_scale",
    String(length_scale),
    "--noise_scale",
    String(noise_scale),
    "--noise_w",
    String(noise_w),
    "--sentence_silence",
    String(sentence_silence),
  ];
  if (speaker != null) args.push("--speaker", String(speaker));
  if (extra_args?.length) args.push(...extra_args.map(String));
  args.push("--", text);

  const proc = spawnSync(PIPER_BIN, args, { encoding: "utf-8" });
  if (proc.status !== 0) {
    throw new Error(`Piper error: ${proc.stderr || proc.stdout}`);
  }
  return outPath;
}

// ---------- MASTERING ----------
function masterWav(inPath, outPath) {
  const af = [
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "highpass=f=80",
    "lowpass=f=12000",
    "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.3:detection=peak",
    "aformat=sample_fmts=s16:sample_rates=48000",
  ].join(",");

  const args = ["-y", "-i", inPath, "-af", af, outPath];
  const proc = spawnSync("ffmpeg", args, { encoding: "utf-8" });
  if (proc.status !== 0) {
    throw new Error(`ffmpeg mastering error: ${proc.stderr || proc.stdout}`);
  }
  return outPath;
}

function exportVariants(wavPath, formats = []) {
  const outputs = {};
  for (const f of formats) {
    const fmt = String(f).toLowerCase();
    let outPath, codecArgs;
    if (fmt === "m4a") {
      outPath = wavPath.replace(/\.wav$/i, ".m4a");
      codecArgs = ["-c:a", "aac", "-b:a", "192k"];
    } else if (fmt === "mp3") {
      outPath = wavPath.replace(/\.wav$/i, ".mp3");
      codecArgs = ["-c:a", "libmp3lame", "-q:a", "2"];
    } else if (fmt === "opus") {
      outPath = wavPath.replace(/\.wav$/i, ".opus");
      codecArgs = ["-c:a", "libopus", "-b:a", "96k"];
    } else {
      continue;
    }

    const args = ["-y", "-i", wavPath, ...codecArgs, outPath];
    const proc = spawnSync("ffmpeg", args, { encoding: "utf-8" });
    if (proc.status !== 0) {
      throw new Error(
        `ffmpeg export error (${fmt}): ${proc.stderr || proc.stdout}`
      );
    }
    outputs[fmt] = outPath;
  }
  return outputs;
}

// ---------- PRESETS ----------
function stylePresets(style = "") {
  const s = style.toLowerCase();
  if (s === "urgent")
    return {
      length_scale: 0.94,
      noise_scale: 0.55,
      noise_w: 0.6,
      sentence_silence: 0.22,
    };
  if (s === "formal")
    return {
      length_scale: 1.08,
      noise_scale: 0.4,
      noise_w: 0.5,
      sentence_silence: 0.3,
    };
  if (s === "friendly")
    return {
      length_scale: 1.02,
      noise_scale: 0.45,
      noise_w: 0.5,
      sentence_silence: 0.32,
    };
  return {
    length_scale: 1.0,
    noise_scale: 0.5,
    noise_w: 0.5,
    sentence_silence: 0.28,
  };
}

// ---------- NEW EXPORTS ----------

/**
 * Part 1: return the announcement text only.
 */
export async function generateAnnouncementText(
  userText,
  { language, style, customStyle = null } = {}
) {
  const draft = await rewriteToAnnouncement(
    userText,
    style,
    customStyle,
    language
  );
  return postprocessStyle(draft, style);
}

/**
 * Part 2: take (possibly edited) text and make audio.
 * - DOES NOT call OpenAI.
 */
export function makeAnnouncement(
  text,
  {
    language,
    gender,
    style = "formal",
    master = true,
    exportFormats = null,
    keepWav = false, // NEW
  } = {}
) {
  const finalText = postprocessStyle(text, style);

  const ts = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 15);
  const rawFile = `raw_${language}_${style}_${gender}_${ts}.wav`;
  const outFile = `announcement_${language}_${style}_${gender}_${ts}.wav`;

  const preset = stylePresets(style);

  synthesizeWithPiper({
    text: finalText,
    language,
    gender,
    outPath: rawFile,
    ...preset,
  });

  let mainAudio = rawFile;
  if (master) {
    masterWav(rawFile, outFile);
    try {
      if (fs.existsSync(rawFile)) fs.unlinkSync(rawFile);
    } catch {}
    mainAudio = outFile;
  }

  let extras = {};
  if (exportFormats?.length) {
    extras = exportVariants(mainAudio, exportFormats);

    // If you don’t want to keep any WAV around:
    if (!keepWav && fs.existsSync(mainAudio)) {
      try {
        fs.unlinkSync(mainAudio);
      } catch {}
      // Optionally, point mainAudio at the first exported format
      const firstFmt = exportFormats[0].toLowerCase();
      if (extras[firstFmt]) mainAudio = extras[firstFmt];
    }
  }

  return { text: finalText, audio: mainAudio, extras };
}
