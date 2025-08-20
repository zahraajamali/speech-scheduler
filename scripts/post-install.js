#!/usr/bin/env node
import { downloadVoices } from "./download-voices.js";

console.log("🎵 Setting up Piper Announce voice models...");

// Check if this is a CI environment or if user wants to skip download
const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

if (isCI) {
  console.log("⚠️  CI environment detected - skipping voice download");
  console.log(
    '💡 Run "npm run download-voices" manually to download voice models'
  );
  process.exit(0);
}

if (skipDownload) {
  console.log("⚠️  Voice download skipped (SKIP_VOICE_DOWNLOAD=true)");
  console.log(
    '💡 Run "npm run download-voices" manually to download voice models'
  );
  process.exit(0);
}

try {
  await downloadVoices();
} catch (error) {
  console.error("❌ Post-install voice download failed:", error.message);
  console.log(
    "💡 You can manually download voices later by running: npm run download-voices"
  );
  // Don't fail the installation, just warn
  process.exit(0);
}
