#!/usr/bin/env node
import { downloadVoices } from "./download-voices.js";
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

function findVoicesDir() {
  const possibleDirs = [
    process.env.VOICES_DIR,
    path.join(process.cwd(), "voices"),
    path.join(__dirname, "..", "voices"),
    path.join(process.env.HOME || "~", ".piper", "voices"),
  ].filter(Boolean);

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) return dir;
  }

  const defaultDir = path.join(__dirname, "..", "voices");
  fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

async function postInstallSetup() {
  // Force output to show even during npm install
  process.stdout.write("\n");
  console.log(colorize("🎵 Setting up Piper Announce...", "bright"));

  // Check if this is a CI environment or if user wants to skip download
  const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
  const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

  if (isCI) {
    console.log(
      colorize(
        "⚠️  CI environment detected - skipping voice download",
        "yellow"
      )
    );
    console.log(
      colorize('💡 Run "piper-voices download" after installation', "cyan")
    );
    return;
  }

  if (skipDownload) {
    console.log(
      colorize(
        "⚠️  Voice download skipped (SKIP_VOICE_DOWNLOAD=true)",
        "yellow"
      )
    );
    console.log(
      colorize('💡 Run "piper-voices download" after installation', "cyan")
    );
    return;
  }

  const voicesDir = findVoicesDir();
  console.log(colorize(`📂 Voices directory: ${voicesDir}`, "cyan"));

  try {
    console.log(colorize("🚀 Downloading voice models...", "blue"));
    console.log(
      colorize("   This may take a few minutes on first install.", "yellow")
    );

    // Call the main download function with postInstall flag
    await downloadVoices(false, true);

    console.log(colorize("✅ Piper Announce setup complete!", "green"));
    console.log(
      colorize(
        "💡 Use 'piper-voices status' to check voice availability",
        "cyan"
      )
    );
  } catch (error) {
    console.error(colorize(`❌ Setup failed: ${error.message}`, "red"));
    console.log(
      colorize("💡 You can download voices manually later:", "yellow")
    );
    console.log(colorize("   piper-voices download", "cyan"));

    // Don't fail the installation - just warn the user
    process.exit(0);
  }
}

// Run the post-install setup
postInstallSetup().catch((error) => {
  console.error(colorize(`❌ Post-install failed: ${error.message}`, "red"));
  console.log(colorize("💡 You can download voices manually later:", "yellow"));
  console.log(colorize("   piper-voices download", "cyan"));
  // Don't fail the installation
  process.exit(0);
});
