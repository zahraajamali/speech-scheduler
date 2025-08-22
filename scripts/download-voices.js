#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const streamPipeline = promisify(pipeline);

// Voice models configuration with download URLs for both .onnx and .json files
const VOICE_MODELS = {
  "en_GB-jenny_dioco-medium": {
    files: {
      onnx: {
        filename: "en_GB-jenny_dioco-medium.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx",
        size: "63MB",
      },
      json: {
        filename: "en_GB-jenny_dioco-medium.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx.json",
        size: "2KB",
      },
    },
    language: "English (GB)",
    gender: "Female",
    quality: "Medium",
  },
  "en_GB-alan-low": {
    files: {
      onnx: {
        filename: "en_GB-alan-low.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/low/en_GB-alan-low.onnx",
        size: "22MB",
      },
      json: {
        filename: "en_GB-alan-low.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/low/en_GB-alan-low.onnx.json",
        size: "2KB",
      },
    },
    language: "English (GB)",
    gender: "Male",
    quality: "Low",
  },
  "es_ES-mls_10246-low": {
    files: {
      onnx: {
        filename: "es_ES-mls_10246-low.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/mls_10246/low/es_ES-mls_10246-low.onnx",
        size: "22MB",
      },
      json: {
        filename: "es_ES-mls_10246-low.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/mls_10246/low/es_ES-mls_10246-low.onnx.json",
        size: "2KB",
      },
    },
    language: "Spanish (ES)",
    gender: "Female",
    quality: "Low",
  },
  "es_ES-carlfm-x_low": {
    files: {
      onnx: {
        filename: "es_ES-carlfm-x_low.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx",
        size: "9MB",
      },
      json: {
        filename: "es_ES-carlfm-x_low.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json",
        size: "1KB",
      },
    },
    language: "Spanish (ES)",
    gender: "Male",
    quality: "Extra Low",
  },
  "ca_ES-upc_ona-x_low": {
    files: {
      onnx: {
        filename: "ca_ES-upc_ona-x_low.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/ca/ca_ES/upc_ona/x_low/ca_ES-upc_ona-x_low.onnx",
        size: "9MB",
      },
      json: {
        filename: "ca_ES-upc_ona-x_low.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/ca/ca_ES/upc_ona/x_low/ca_ES-upc_ona-x_low.onnx.json",
        size: "1KB",
      },
    },
    language: "Catalan (ES)",
    gender: "Female",
    quality: "Extra Low",
  },
  "ca_ES-upc_pau-x_low": {
    files: {
      onnx: {
        filename: "ca_ES-upc_pau-x_low.onnx",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/ca/ca_ES/upc_pau/x_low/ca_ES-upc_pau-x_low.onnx",
        size: "9MB",
      },
      json: {
        filename: "ca_ES-upc_pau-x_low.onnx.json",
        url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/ca/ca_ES/upc_pau/x_low/ca_ES-upc_pau-x_low.onnx.json",
        size: "1KB",
      },
    },
    language: "Catalan (ES)",
    gender: "Male",
    quality: "Extra Low",
  },
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
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

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Check if running in npm environment
function isRunningInNpm() {
  return (
    process.env.npm_lifecycle_event ||
    process.env.npm_execpath ||
    process.env.npm_config_cache
  );
}

// Create a simple text-based progress indicator that works with npm
function createSimpleProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  const width = 20;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percentage}%`;
}

// Download function optimized for npm compatibility
async function downloadFile(
  url,
  filepath,
  filename,
  expectedSize,
  fileIndex = 0,
  totalFiles = 1,
  isPostInstall = false
) {
  const isNpm = isRunningInNpm();

  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const totalSize = parseInt(response.headers.get("content-length") || "0");
      let downloadedSize = 0;
      let lastProgressUpdate = 0;
      const startTime = Date.now();

      const fileStream = createWriteStream(filepath);

      // Show initial message
      const fileType = filename.endsWith(".json") ? "Config" : "Voice Model";
      const prefix = totalFiles > 1 ? `[${fileIndex}/${totalFiles}] ` : "";

      console.log(
        colorize(
          `${prefix}📥 Downloading ${fileType}: ${filename} (${expectedSize})`,
          "blue"
        )
      );

      // Create a transform stream to track progress
      const progressStream = new (await import("stream")).Transform({
        transform(chunk, encoding, callback) {
          downloadedSize += chunk.length;
          const now = Date.now();

          // Show progress at regular intervals that work with npm
          const timeSinceLastUpdate = now - lastProgressUpdate;

          if (totalSize > 0) {
            const percent = Math.floor((downloadedSize / totalSize) * 100);

            // Show progress every 2 seconds or at key percentages (25%, 50%, 75%)
            const shouldUpdate =
              timeSinceLastUpdate > 2000 ||
              (percent > 0 &&
                [25, 50, 75, 100].includes(percent) &&
                timeSinceLastUpdate > 500);

            if (shouldUpdate) {
              const downloaded = formatBytes(downloadedSize);
              const total = formatBytes(totalSize);
              const elapsed = Math.floor((now - startTime) / 1000);

              if (isNpm || isPostInstall) {
                // Simple progress for npm
                console.log(
                  `    📊 ${percent}% (${downloaded}/${total}) - ${elapsed}s`
                );
              } else {
                // More detailed progress for direct CLI usage
                const progressBar = createSimpleProgress(
                  downloadedSize,
                  totalSize
                );
                console.log(
                  `    ${progressBar} ${downloaded}/${total} - ${elapsed}s`
                );
              }

              lastProgressUpdate = now;
            }
          } else {
            // Unknown size - show every 3 seconds
            if (timeSinceLastUpdate > 3000) {
              console.log(
                `    📊 Downloaded: ${formatBytes(
                  downloadedSize
                )} - ${Math.floor((now - startTime) / 1000)}s`
              );
              lastProgressUpdate = now;
            }
          }

          callback(null, chunk);
        },
      });

      await streamPipeline(response.body, progressStream, fileStream);

      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        colorize(`    ✅ ${filename} completed (${totalTime}s)`, "green")
      );

      resolve();
    } catch (error) {
      console.log(
        colorize(
          `    ❌ Failed to download ${filename}: ${error.message}`,
          "red"
        )
      );
      reject(error);
    }
  });
}

function checkExistingVoices(voicesDir) {
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

async function downloadVoices(force = false, isPostInstall = false) {
  if (!isPostInstall) {
    console.log(colorize("\n🎵 Piper Announce Voice Downloader", "bright"));
    console.log(colorize("=".repeat(50), "blue"));
  }

  const voicesDir = findVoicesDir();

  if (!isPostInstall) {
    console.log(colorize(`\n📂 Voices directory: ${voicesDir}`, "yellow"));
  }

  const { existing, missing } = checkExistingVoices(voicesDir);

  if (!force && missing.length === 0) {
    if (!isPostInstall) {
      console.log(
        colorize("\n✅ All voice models are already downloaded!", "green")
      );

      console.log(colorize("\n📋 Available voices:", "cyan"));
      existing.forEach(({ voiceData }) => {
        console.log(
          `   • ${voiceData.language} ${voiceData.gender} (${voiceData.quality})`
        );
      });
    }
    return;
  }

  // Prepare download list
  const filesToDownload = [];

  if (force) {
    // Re-download everything
    for (const [voiceName, voiceData] of Object.entries(VOICE_MODELS)) {
      const onnxPath = path.join(voicesDir, voiceData.files.onnx.filename);
      const jsonPath = path.join(voicesDir, voiceData.files.json.filename);

      filesToDownload.push({
        voiceName,
        filename: voiceData.files.onnx.filename,
        filepath: onnxPath,
        url: voiceData.files.onnx.url,
        size: voiceData.files.onnx.size,
      });

      filesToDownload.push({
        voiceName,
        filename: voiceData.files.json.filename,
        filepath: jsonPath,
        url: voiceData.files.json.url,
        size: voiceData.files.json.size,
      });
    }
  } else {
    // Only download missing files
    missing.forEach(({ missingFiles }) => {
      filesToDownload.push(...missingFiles);
    });
  }

  if (filesToDownload.length === 0) {
    console.log(colorize("✅ Nothing to download!", "green"));
    return;
  }

  // Calculate total size
  let totalSizeMB = 0;
  filesToDownload.forEach((file) => {
    const sizeNum = parseFloat(file.size);
    totalSizeMB += file.size.includes("MB") ? sizeNum : sizeNum / 1024;
  });

  if (!isPostInstall) {
    console.log(
      colorize(
        `\n📊 Will download ${filesToDownload.length} files (~${Math.round(
          totalSizeMB
        )}MB total)`,
        "cyan"
      )
    );
  }

  if (force) {
    console.log(colorize("🔄 Force mode: Re-downloading all voices", "yellow"));
  }

  console.log(colorize("🚀 Starting downloads...", "blue"));

  let successCount = 0;
  let failCount = 0;

  // Download files with progress
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    try {
      await downloadFile(
        file.url,
        file.filepath,
        file.filename,
        file.size,
        i + 1,
        filesToDownload.length,
        isPostInstall
      );
      successCount++;
    } catch (error) {
      failCount++;
      // Try to clean up partial download
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch {}
    }

    // Show overall progress
    const overallPercent = Math.round(((i + 1) / filesToDownload.length) * 100);
    console.log(
      colorize(
        `🔄 Overall Progress: ${overallPercent}% (${i + 1}/${
          filesToDownload.length
        } files)`,
        "magenta"
      )
    );
  }

  // Final summary
  console.log(colorize("\n📊 Download Summary:", "bright"));
  if (successCount > 0) {
    console.log(
      colorize(`✅ Successfully downloaded: ${successCount} files`, "green")
    );
  }
  if (failCount > 0) {
    console.log(colorize(`❌ Failed downloads: ${failCount} files`, "red"));
    console.log(
      colorize(
        "💡 You can retry failed downloads by running the command again",
        "yellow"
      )
    );
  }

  if (successCount === filesToDownload.length) {
    console.log(colorize("🎉 All voice models are now ready!", "green"));
  }
}

// Export for programmatic use
export { downloadVoices, checkExistingVoices, VOICE_MODELS };

// CLI usage
// Update the CLI usage part
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes("--force") || process.argv.includes("-f");
  const help = process.argv.includes("--help") || process.argv.includes("-h");

  if (help) {
    console.log(`
${colorize("Piper Announce Voice Downloader", "bright")}

Usage: node scripts/download-voices.js [options]

Options:
  -f, --force    Re-download all voice models (even if they exist)
  -h, --help     Show this help message

Examples:
  node scripts/download-voices.js          # Download missing voices
  node scripts/download-voices.js --force  # Re-download all voices
`);
    process.exit(0);
  }

  downloadVoices(force, false).catch((error) => {
    console.error(colorize(`\n❌ Download failed: ${error.message}`, "red"));
    process.exit(1);
  });
}
