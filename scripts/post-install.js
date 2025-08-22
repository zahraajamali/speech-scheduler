#!/usr/bin/env node
import { downloadVoices, checkExistingVoices } from "./download-voices.js";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

console.log(
  colorize("\n🎵 Setting up Piper Announce voice models...", "bright")
);

// Check if this is a CI environment or if user wants to skip download
const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

if (isCI) {
  console.log(
    colorize("⚠️  CI environment detected - skipping voice download", "yellow")
  );
  console.log(
    colorize(
      '💡 Run "piper-voices download" manually to download voice models',
      "cyan"
    )
  );
  process.exit(0);
}

if (skipDownload) {
  console.log(
    colorize("⚠️  Voice download skipped (SKIP_VOICE_DOWNLOAD=true)", "yellow")
  );
  console.log(
    colorize(
      '💡 Run "piper-voices download" manually to download voice models',
      "cyan"
    )
  );
  process.exit(0);
}

// Check if voices are already available
try {
  const { missing } = checkExistingVoices();
  const totalMissingFiles = missing.reduce(
    (acc, voice) => acc + voice.missingFiles.length,
    0
  );

  if (totalMissingFiles === 0) {
    console.log(
      colorize("✅ All voice models are already available!", "green")
    );
    process.exit(0);
  }

  console.log(
    colorize(`📥 Downloading ${totalMissingFiles} voice model files...`, "blue")
  );
  console.log(
    colorize(
      "This may take a few minutes depending on your connection.",
      "yellow"
    )
  );

  await downloadVoices(false, true); // Pass true for isPostInstall

  console.log(colorize("\n🎉 Voice models setup complete!", "green"));
  console.log(
    colorize(
      "You can now use piper-announce with all supported languages.",
      "cyan"
    )
  );
} catch (error) {
  console.error(
    colorize(`❌ Post-install voice download failed: ${error.message}`, "red")
  );
  console.log(
    colorize("💡 You can manually download voices later by running:", "yellow")
  );
  console.log(colorize("   piper-voices download", "cyan"));

  // Don't fail the installation, just warn
  process.exit(0);
}
