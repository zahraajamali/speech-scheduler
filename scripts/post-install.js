#!/usr/bin/env node
import { VOICE_MODELS } from "./download-voices.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const streamPipeline = promisify(pipeline);

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

function checkExistingVoicesLocal(voicesDir) {
  const existing = [];
  const missing = [];

  for (const [voiceName, voiceData] of Object.entries(VOICE_MODELS)) {
    const onnxPath = path.join(voicesDir, voiceData.files.onnx.filename);
    const jsonPath = path.join(voicesDir, voiceData.files.json.filename);

    const onnxExists = fs.existsSync(onnxPath);
    const jsonExists = fs.existsSync(jsonPath);

    if (onnxExists && jsonExists) {
      existing.push({
        voiceName,
        voiceData,
        files: {
          onnx: onnxPath,
          json: jsonPath,
        },
      });
    } else {
      // Add missing files to download list
      const missingFiles = [];
      if (!onnxExists) {
        missingFiles.push({
          type: "onnx",
          filename: voiceData.files.onnx.filename,
          filepath: onnxPath,
          url: voiceData.files.onnx.url,
          size: voiceData.files.onnx.size,
        });
      }
      if (!jsonExists) {
        missingFiles.push({
          type: "json",
          filename: voiceData.files.json.filename,
          filepath: jsonPath,
          url: voiceData.files.json.url,
          size: voiceData.files.json.size,
        });
      }

      missing.push({
        voiceName,
        voiceData,
        missingFiles,
      });
    }
  }

  return { existing, missing };
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function downloadFileSimple(url, filepath, filename, expectedSize) {
  console.log(
    colorize(`📥 Downloading ${filename} (${expectedSize})...`, "blue")
  );

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0");
    let downloadedSize = 0;
    let lastLoggedPercent = 0;

    const fileStream = createWriteStream(filepath);

    // Create a transform stream to track progress
    const progressStream = new (await import("stream")).Transform({
      transform(chunk, encoding, callback) {
        downloadedSize += chunk.length;

        if (totalSize > 0) {
          const percent = Math.floor((downloadedSize / totalSize) * 100);
          // Log progress every 25% to avoid spam
          if (percent >= lastLoggedPercent + 25 && percent <= 100) {
            console.log(
              `   ${percent}% (${formatBytes(downloadedSize)}/${formatBytes(
                totalSize
              )})`
            );
            lastLoggedPercent = percent;
          }
        }

        callback(null, chunk);
      },
    });

    await streamPipeline(response.body, progressStream, fileStream);
    console.log(colorize(`   ✅ ${filename} completed`, "green"));
  } catch (error) {
    console.log(colorize(`   ❌ Failed: ${error.message}`, "red"));
    throw error;
  }
}

async function downloadVoicesForInstall() {
  console.log(
    colorize("\n🎵 Setting up Piper Announce voice models...", "bright")
  );

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

  const { missing } = checkExistingVoicesLocal(voicesDir);

  const totalMissingFiles = missing.reduce(
    (acc, voice) => acc + voice.missingFiles.length,
    0
  );

  if (totalMissingFiles === 0) {
    console.log(
      colorize("✅ All voice models are already available!", "green")
    );
    return;
  }

  console.log(
    colorize(
      `\n📦 Need to download ${totalMissingFiles} voice files:`,
      "yellow"
    )
  );

  // Show what will be downloaded
  missing.forEach(({ voiceData, missingFiles }) => {
    console.log(
      `   • ${voiceData.language} ${voiceData.gender} (${missingFiles.length} files)`
    );
  });

  // Calculate total size
  let totalSizeMB = 0;
  missing.forEach(({ missingFiles }) => {
    missingFiles.forEach((file) => {
      const sizeNum = parseFloat(file.size);
      totalSizeMB += file.size.includes("MB") ? sizeNum : sizeNum / 1024;
    });
  });

  console.log(
    colorize(`📊 Total download size: ~${Math.round(totalSizeMB)}MB`, "cyan")
  );
  console.log(colorize("🚀 Starting downloads...\n", "blue"));

  // Prepare download list
  const filesToDownload = [];
  missing.forEach(({ missingFiles }) => {
    filesToDownload.push(...missingFiles);
  });

  let successCount = 0;
  let failCount = 0;

  // Download files one by one with progress
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    console.log(colorize(`[${i + 1}/${filesToDownload.length}]`, "cyan"));

    try {
      await downloadFileSimple(
        file.url,
        file.filepath,
        file.filename,
        file.size
      );
      successCount++;
    } catch (error) {
      failCount++;
      // Clean up partial download
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch {}
    }
  }

  // Final summary
  console.log(colorize("\n📊 Installation Summary:", "bright"));
  if (successCount > 0) {
    console.log(
      colorize(`✅ Downloaded ${successCount} files successfully`, "green")
    );
  }
  if (failCount > 0) {
    console.log(colorize(`❌ ${failCount} files failed`, "red"));
    console.log(
      colorize(
        "💡 Run 'piper-voices download' to retry failed downloads",
        "yellow"
      )
    );
  }

  if (successCount === filesToDownload.length) {
    console.log(colorize("🎉 All voice models ready!", "green"));
  }
}

// Run the installation
downloadVoicesForInstall().catch((error) => {
  console.error(colorize(`❌ Installation failed: ${error.message}`, "red"));
  console.log(colorize("💡 You can download voices manually later:", "yellow"));
  console.log(colorize("   piper-voices download", "cyan"));
  // Don't fail the installation
  process.exit(0);
});
