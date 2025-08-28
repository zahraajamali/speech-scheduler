#!/usr/bin/env node
import { downloadVoices } from "./download-voices.js";
import { downloadAllBinaries, PIPER_BINARIES } from "./download-binaries.js";
import { getBundledPiperPath, getPlatformKey } from "../src/piper-bundled.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function forceOutput(message) {
  process.stderr.write(message + "\n");
  process.stdout.write(message + "\n");
  if (process.stdout.flush) process.stdout.flush();
  if (process.stderr.flush) process.stderr.flush();
}

function checkBinaryAvailability() {
  try {
    const platformKey = getPlatformKey();
    const piperPath = getBundledPiperPath();
    return {
      available: fs.existsSync(piperPath),
      platform: platformKey,
      path: piperPath,
    };
  } catch (error) {
    return {
      available: false,
      platform: "unsupported",
      error: error.message,
    };
  }
}

async function postInstallSetup() {
  forceOutput("");
  forceOutput(
    colorize("🎵 Setting up Piper Announce with bundled TTS...", "bright")
  );

  const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
  const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";
  const skipBinaries = process.env.SKIP_BINARY_DOWNLOAD === "true";

  // Check if Piper binary is available
  const binaryStatus = checkBinaryAvailability();

  if (!binaryStatus.available && !skipBinaries) {
    if (binaryStatus.platform === "unsupported") {
      forceOutput(
        colorize(`⚠️  Unsupported platform: ${binaryStatus.error}`, "yellow")
      );
      forceOutput(colorize("💡 Please install Piper TTS manually", "cyan"));
    } else {
      forceOutput(
        colorize(
          `📦 Downloading Piper binary for ${binaryStatus.platform}...`,
          "blue"
        )
      );
      try {
        await downloadAllBinaries();
        forceOutput(
          colorize("✅ Piper binary downloaded successfully!", "green")
        );
      } catch (error) {
        forceOutput(
          colorize(`❌ Failed to download binary: ${error.message}`, "red")
        );
        forceOutput(
          colorize(
            "💡 You can download manually with: npm run download-binaries",
            "cyan"
          )
        );
      }
    }
  } else if (binaryStatus.available) {
    forceOutput(
      colorize(`✅ Piper binary available: ${binaryStatus.platform}`, "green")
    );
  }

  // Download voices if needed
  if (isCI) {
    forceOutput(
      colorize("⚠️  CI environment - skipping voice download", "yellow")
    );
  } else if (skipDownload) {
    forceOutput(colorize("⚠️  Voice download skipped", "yellow"));
  } else {
    try {
      forceOutput(colorize("🎤 Downloading voice models...", "blue"));
      await downloadVoices(false, true);
    } catch (error) {
      forceOutput(
        colorize(`⚠️  Voice download failed: ${error.message}`, "yellow")
      );
      forceOutput(colorize("💡 Run 'npm run download-voices' later", "cyan"));
    }
  }

  forceOutput("");
  forceOutput(colorize("🎉 Piper Announce setup complete!", "green"));
  forceOutput(colorize("💡 No external Piper installation required!", "cyan"));
  forceOutput(colorize("🚀 Ready to generate announcements!", "blue"));
}

postInstallSetup().catch((error) => {
  forceOutput(colorize(`❌ Setup failed: ${error.message}`, "red"));
  process.exit(0);
});
