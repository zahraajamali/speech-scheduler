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

// Check if we're running in npm (npm buffers output differently)
function isRunningInNpm() {
  return (
    process.env.npm_lifecycle_event ||
    process.env.npm_execpath ||
    process.env.npm_config_cache
  );
}

// Download function that works with npm's output buffering
async function downloadFileWithNpmSupport(
  url,
  filepath,
  filename,
  expectedSize,
  fileIndex,
  totalFiles
) {
  const isNpm = isRunningInNpm();

  // Use process.stdout.write for immediate output, console.log for npm compatibility
  const log = (message) => {
    if (isNpm) {
      console.log(message); // npm shows console.log immediately
    } else {
      process.stdout.write(message + "\n");
    }
  };

  log(
    colorize(
      `[${fileIndex}/${totalFiles}] 📥 Downloading ${filename} (${expectedSize})`,
      "blue"
    )
  );

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0");
    let downloadedSize = 0;
    const startTime = Date.now();
    let lastProgressTime = 0;

    const fileStream = createWriteStream(filepath);

    // Track progress without using \r (carriage return) which doesn't work in npm
    const progressStream = new (await import("stream")).Transform({
      transform(chunk, encoding, callback) {
        downloadedSize += chunk.length;
        const now = Date.now();

        if (totalSize > 0) {
          const percent = Math.floor((downloadedSize / totalSize) * 100);

          // Show progress at 25%, 50%, 75%, 100% or every 3 seconds
          const shouldShowProgress =
            (percent > 0 &&
              percent % 25 === 0 &&
              now - lastProgressTime > 1000) ||
            now - lastProgressTime > 3000;

          if (shouldShowProgress) {
            const downloaded = formatBytes(downloadedSize);
            const total = formatBytes(totalSize);
            const elapsed = Math.floor((now - startTime) / 1000);

            log(
              `    📊 ${percent}% complete (${downloaded}/${total}) - ${elapsed}s elapsed`
            );
            lastProgressTime = now;
          }
        } else {
          // Unknown size, show every 5MB or 5 seconds
          if (now - lastProgressTime > 5000) {
            log(`    📊 Downloaded ${formatBytes(downloadedSize)}`);
            lastProgressTime = now;
          }
        }

        callback(null, chunk);
      },
    });

    await streamPipeline(response.body, progressStream, fileStream);

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    log(colorize(`    ✅ ${filename} completed in ${totalTime}s`, "green"));
  } catch (error) {
    log(colorize(`    ❌ Failed: ${error.message}`, "red"));
    throw error;
  }
}

async function downloadVoicesForInstall() {
  const isNpm = isRunningInNpm();

  // Use console.log for npm compatibility
  console.log(
    colorize("\n🎵 Setting up Piper Announce voice models...", "bright")
  );

  const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

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
    colorize(`\n📦 Need to download ${totalMissingFiles} voice files`, "yellow")
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
  console.log(colorize("🚀 Starting downloads...", "blue"));

  if (isNpm) {
    console.log(
      colorize("📡 Progress will be shown as files download...", "yellow")
    );
  }

  // Prepare download list
  const filesToDownload = [];
  missing.forEach(({ missingFiles }) => {
    filesToDownload.push(...missingFiles);
  });

  let successCount = 0;
  let failCount = 0;

  // Download files with npm-compatible progress
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    try {
      await downloadFileWithNpmSupport(
        file.url,
        file.filepath,
        file.filename,
        file.size,
        i + 1,
        filesToDownload.length
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

    // Show overall progress after each file
    const overallPercent = Math.round(((i + 1) / filesToDownload.length) * 100);
    console.log(
      colorize(
        `🔄 Overall: ${overallPercent}% complete (${i + 1}/${
          filesToDownload.length
        } files)`,
        "magenta"
      )
    );
  }

  // Final summary
  console.log(colorize("\n📊 Installation Complete!", "bright"));
  if (successCount > 0) {
    console.log(
      colorize(`✅ Successfully downloaded ${successCount} files`, "green")
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
    console.log(
      colorize(
        "🎉 All voice models ready! You can now use piper-announce!",
        "green"
      )
    );
  } else if (successCount > 0) {
    console.log(
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
  process.exit(0);
});
