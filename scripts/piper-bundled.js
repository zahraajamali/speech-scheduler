import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPlatformKey() {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "linux" && arch === "x64") return "linux-x64";
  if (platform === "win32" && arch === "x64") return "win32-x64";
  if (platform === "darwin" && arch === "x64") return "darwin-x64";
  if (platform === "darwin" && arch === "arm64") return "darwin-arm64";

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function getBundledPiperPath() {
  const platformKey = getPlatformKey();
  const binariesDir = path.join(__dirname, "..", "binaries");

  let executablePath;
  if (platformKey === "win32-x64") {
    executablePath = path.join(binariesDir, platformKey, "piper", "piper.exe");
  } else {
    executablePath = path.join(binariesDir, platformKey, "piper", "piper");
  }

  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `Bundled Piper binary not found at: ${executablePath}\n` +
        `Platform: ${platformKey}\n` +
        `Run 'npm run download-binaries' to download missing binaries.`
    );
  }

  return executablePath;
}

function synthesizeWithBundledPiper({
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
  // Use the same voice configuration from your existing code
  const VOICES = {
    en: {
      female: path.join(
        __dirname,
        "..",
        "voices",
        "en_GB-jenny_dioco-medium.onnx"
      ),
      male: path.join(__dirname, "..", "voices", "en_GB-alan-low.onnx"),
    },
    es: {
      female: path.join(__dirname, "..", "voices", "es_ES-mls_10246-low.onnx"),
      male: path.join(__dirname, "..", "voices", "es_ES-carlfm-x_low.onnx"),
    },
    ca: {
      female: path.join(__dirname, "..", "voices", "ca_ES-upc_ona-x_low.onnx"),
      male: path.join(__dirname, "..", "voices", "ca_ES-upc_pau-x_low.onnx"),
    },
  };

  const voicePath = VOICES[language?.toLowerCase()]?.[gender?.toLowerCase()];
  const jsonPath = voicePath + ".json";

  if (!voicePath || !fs.existsSync(voicePath) || !fs.existsSync(jsonPath)) {
    throw new Error(
      `Missing voice files for language='${language}' gender='${gender}'\n` +
        `Expected: ${voicePath} and ${jsonPath}\n` +
        `Run 'npm run download-voices' to download missing voice models.`
    );
  }

  // Get the bundled Piper binary
  const piperBin = getBundledPiperPath();

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

  const proc = spawnSync(piperBin, args, { encoding: "utf-8" });
  if (proc.status !== 0) {
    throw new Error(`Piper error: ${proc.stderr || proc.stdout}`);
  }
  return outPath;
}

export { getBundledPiperPath, synthesizeWithBundledPiper, getPlatformKey };
