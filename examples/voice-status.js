#!/usr/bin/env node
import { getVoiceStatus } from "../src/index.js";

console.log("🎵 Checking Voice Model Status...\n");

const { availability, missingVoices } = getVoiceStatus();

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bright: "\x1b[1m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Display availability status
console.log(colorize("📊 Voice Model Status:", "bright"));
console.log("═".repeat(50));

const languageNames = {
  en: "English (GB)",
  es: "Spanish (ES)",
  ca: "Catalan (ES)",
};

for (const [lang, genders] of Object.entries(availability)) {
  console.log(colorize(`\n${languageNames[lang]} (${lang}):`, "blue"));

  for (const [gender, isAvailable] of Object.entries(genders)) {
    const status = isAvailable
      ? colorize("✅ Available", "green")
      : colorize("❌ Missing", "red");

    console.log(
      `  ${gender.charAt(0).toUpperCase() + gender.slice(1)}: ${status}`
    );

    // Show details about missing files
    if (!isAvailable) {
      const missingVoice = missingVoices.find(
        (v) => v.language === lang && v.gender === gender
      );
      if (missingVoice && missingVoice.missingFiles) {
        const missing = missingVoice.missingFiles.map((type) =>
          type === "onnx" ? "🧠 Model (.onnx)" : "⚙️ Config (.json)"
        );
        console.log(`    Missing: ${missing.join(", ")}`);
      }
    }
  }
}

// Show missing voices summary
if (missingVoices.length > 0) {
  console.log(colorize("\n⚠️  Missing Voice Models:", "yellow"));
  missingVoices.forEach((voice) => {
    console.log(`   • ${voice.filename} (${voice.language}/${voice.gender})`);
  });

  console.log(colorize("\n💡 To download missing voices:", "yellow"));
  console.log(colorize("   npm run download-voices", "bright"));
} else {
  console.log(colorize("\n🎉 All voice models are available!", "green"));
}

console.log("\n" + "═".repeat(50));
