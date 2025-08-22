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

// Simplified download function optimized for npm install visibility
async function downloadFileForInstall(url, filepath, filename, expectedSize) {
  // Use console.error to bypass npm's output buffering
  console.error(
    colorize(`📥 Downloading ${filename} (${expectedSize})`, "blue")
  );

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0");
    let downloadedSize = 0;
    let lastUpdate = 0;

    const fileStream = createWriteStream(filepath);

    // Create a transform stream to track progress
    const progressStream = new (await import("stream")).Transform({
      transform(chunk, encoding, callback) {
        downloadedSize += chunk.length;

        // Only update every 2 seconds and at certain percentages to avoid spam
        const now = Date.now();
        if (totalSize > 0 && now - lastUpdate > 2000) {
          const percent = Math.floor((downloadedSize / totalSize) * 100);
          if (percent > 0 && percent % 20 === 0) {
            // Show at 20%, 40%, 60%, 80%
            console.error(
              `   Progress: ${percent}% (${formatBytes(downloadedSize)})`
            );
            lastUpdate = now;
          }
        }

        callback(null, chunk);
      },
    });

    await streamPipeline(response.body, progressStream, fileStream);
    console.error(colorize(`   ✅ ${filename} completed`, "green"));
  } catch (error) {
    console.error(colorize(`   ❌ Failed: ${error.message}`, "red"));
    throw error;
  }
}

async function downloadVoicesForInstall() {
  // Force output to stderr which npm shows more reliably
  console.error(
    colorize("\n🎵 Setting up Piper Announce voice models...", "bright")
  );

  // Only skip if explicitly requested, not for CI
  const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

  if (skipDownload) {
    console.error(
      colorize(
        "⚠️  Voice download skipped (SKIP_VOICE_DOWNLOAD=true)",
        "yellow"
      )
    );
    console.error(
      colorize('💡 Run "piper-voices download" after installation', "cyan")
    );
    return;
  }

  const voicesDir = findVoicesDir();
  console.error(colorize(`📂 Voices directory: ${voicesDir}`, "cyan"));

  const { missing } = checkExistingVoicesLocal(voicesDir);

  const totalMissingFiles = missing.reduce(
    (acc, voice) => acc + voice.missingFiles.length,
    0
  );

  if (totalMissingFiles === 0) {
    console.error(
      colorize("✅ All voice models are already available!", "green")
    );
    return;
  }

  console.error(
    colorize(`\n📦 Downloading ${totalMissingFiles} voice files...`, "yellow")
  );

  // Show simplified summary
  const voiceCount = missing.length;
  console.error(colorize(`🎭 ${voiceCount} voice models needed`, "cyan"));

  // Calculate total size
  let totalSizeMB = 0;
  missing.forEach(({ missingFiles }) => {
    missingFiles.forEach((file) => {
      const sizeNum = parseFloat(file.size);
      totalSizeMB += file.size.includes("MB") ? sizeNum : sizeNum / 1024;
    });
  });

  console.error(
    colorize(`📊 Total size: ~${Math.round(totalSizeMB)}MB`, "cyan")
  );
  console.error(
    colorize("🚀 Starting downloads (this may take a few minutes)...\n", "blue")
  );

  // Prepare download list
  const filesToDownload = [];
  missing.forEach(({ missingFiles }) => {
    filesToDownload.push(...missingFiles);
  });

  let successCount = 0;
  let failCount = 0;

  // Download files with minimal but visible progress
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    console.error(colorize(`[${i + 1}/${filesToDownload.length}]`, "magenta"));

    try {
      await downloadFileForInstall(
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

    // Show overall progress
    const overallPercent = Math.round(((i + 1) / filesToDownload.length) * 100);
    console.error(
      colorize(
        `Overall Progress: ${overallPercent}% (${i + 1}/${
          filesToDownload.length
        } files)`,
        "yellow"
      )
    );
  }

  // Final summary
  console.error(colorize("\n📊 Installation Summary:", "bright"));
  if (successCount > 0) {
    console.error(
      colorize(`✅ Successfully downloaded ${successCount} files`, "green")
    );
  }
  if (failCount > 0) {
    console.error(colorize(`❌ ${failCount} files failed`, "red"));
    console.error(
      colorize(
        "💡 Run 'piper-voices download' to retry failed downloads",
        "yellow"
      )
    );
  }

  if (successCount === filesToDownload.length) {
    console.error(colorize("🎉 All voice models ready!", "green"));
    console.error(colorize("You can now use piper-announce!", "cyan"));
  } else if (successCount > 0) {
    console.error(
      colorize(
        "⚠️  Some voice models available, others can be downloaded manually",
        "yellow"
      )
    );
  }
}

// Run the installation
downloadVoicesForInstall().catch((error) => {
  console.error(colorize(`❌ Installation error: ${error.message}`, "red"));
  console.error(
    colorize(
      "💡 You can download voices manually after installation:",
      "yellow"
    )
  );
  console.error(colorize("   piper-voices download", "cyan"));
  // Don't fail the installation - npm install should succeed
  process.exit(0);
});
