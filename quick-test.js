#!/usr/bin/env node
/**
 * Quick Test Script for Piper Announce Voice Download Features
 * Run: node quick-test.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function quickTest() {
  log("\n🚀 Quick Test: Piper Announce Voice Downloads", "bright");
  log("=".repeat(60), "blue");

  // Test 1: Check project structure
  log("\n1️⃣ Checking project structure...", "blue");

  const requiredFiles = [
    "package.json",
    "src/index.js",
    "scripts/download-voices.js",
    "scripts/post-install.js",
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`   ✅ ${file}`, "green");
    } else {
      log(`   ❌ Missing: ${file}`, "red");
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log("\n⚠️  Please create the missing files first!", "yellow");
    log("💡 Copy the code from the artifacts provided", "yellow");
    return;
  }

  // Test 2: Check package.json scripts
  log("\n2️⃣ Checking package.json scripts...", "blue");

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const expectedScripts = [
      "postinstall",
      "download-voices",
      "download-voices:force",
      "check-voices",
    ];

    for (const script of expectedScripts) {
      if (packageJson.scripts[script]) {
        log(`   ✅ ${script}: ${packageJson.scripts[script]}`, "green");
      } else {
        log(`   ❌ Missing script: ${script}`, "red");
      }
    }
  } catch (error) {
    log(`   ❌ Error reading package.json: ${error.message}`, "red");
    return;
  }

  // Test 3: Test voice downloader import
  log("\n3️⃣ Testing voice downloader import...", "blue");

  try {
    const { VOICE_MODELS } = await import("./scripts/download-voices.js");
    const voiceCount = Object.keys(VOICE_MODELS).length;
    log(
      `   ✅ Successfully imported VOICE_MODELS (${voiceCount} voices)`,
      "green"
    );

    // Show available voices
    log("\n   Available voices:", "yellow");
    for (const [filename, info] of Object.entries(VOICE_MODELS)) {
      log(
        `     • ${filename} (${info.language}, ${info.gender}, ${info.size})`,
        "reset"
      );
    }
  } catch (error) {
    log(`   ❌ Import error: ${error.message}`, "red");
    log(
      "   💡 Make sure scripts/download-voices.js has the correct export",
      "yellow"
    );
    return;
  }

  // Test 4: Test main index.js import
  log("\n4️⃣ Testing main module import...", "blue");

  try {
    const module = await import("./src/index.js");
    const functions = [
      "generateAnnouncementText",
      "makeAnnouncement",
      "getVoiceStatus",
    ];

    for (const func of functions) {
      if (typeof module[func] === "function") {
        log(`   ✅ ${func} function available`, "green");
      } else {
        log(`   ❌ Missing function: ${func}`, "red");
      }
    }
  } catch (error) {
    log(`   ❌ Import error: ${error.message}`, "red");
    return;
  }

  // Test 5: Check environment
  log("\n5️⃣ Checking environment...", "blue");

  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
  if (majorVersion >= 16) {
    log(`   ✅ Node.js version: ${nodeVersion}`, "green");
  } else {
    log(`   ⚠️  Node.js version: ${nodeVersion} (recommend 16+)`, "yellow");
  }

  // Check environment variables
  if (process.env.OPENAI_API_KEY) {
    log("   ✅ OPENAI_API_KEY is set", "green");
  } else {
    log("   ⚠️  OPENAI_API_KEY not set (needed for text generation)", "yellow");
  }

  // Check voices directory
  if (fs.existsSync("voices")) {
    const voiceFiles = fs
      .readdirSync("voices")
      .filter((f) => f.endsWith(".onnx"));
    log(`   ✅ Voices directory exists (${voiceFiles.length} files)`, "green");
  } else {
    log("   ⚠️  Voices directory does not exist (will be created)", "yellow");
  }

  // Test 6: Try running voice status check
  log("\n6️⃣ Testing voice status function...", "blue");

  try {
    const { getVoiceStatus } = await import("./src/index.js");
    const status = getVoiceStatus();
    log("   ✅ getVoiceStatus() executed successfully", "green");

    let availableCount = 0;
    let totalCount = 0;

    for (const [lang, genders] of Object.entries(status.availability)) {
      for (const [gender, available] of Object.entries(genders)) {
        totalCount++;
        if (available) availableCount++;
      }
    }

    log(
      `   📊 Voice availability: ${availableCount}/${totalCount} voices available`,
      "magenta"
    );

    if (status.missingVoices.length > 0) {
      log(
        `   ⚠️  ${status.missingVoices.length} voices need to be downloaded`,
        "yellow"
      );
    }
  } catch (error) {
    log(`   ❌ Error testing voice status: ${error.message}`, "red");
  }

  // Summary and next steps
  log("\n" + "=".repeat(60), "blue");
  log("🎯 Test Summary & Next Steps:", "bright");

  log("\n✅ Ready to test:", "green");
  log("   npm run download-voices    # Download missing voices", "reset");
  log("   npm run check-voices       # Check voice status", "reset");
  log("   node examples/voice-status.js  # Detailed voice status", "reset");

  log("\n🧪 For full testing:", "yellow");
  log("   export OPENAI_API_KEY=your_key_here", "reset");
  log("   node test-new-features.js  # Test text generation + audio", "reset");

  log("\n📦 For package testing:", "magenta");
  log("   npm pack                   # Create package tarball", "reset");
  log(
    "   cd /tmp && npm init -y && npm install /path/to/your/tarball",
    "reset"
  );

  log("\n🎉 Your voice download system is ready to test!", "green");
}

// Run the quick test
quickTest().catch((error) => {
  log(`\n❌ Quick test failed: ${error.message}`, "red");
  console.error(error);
});
