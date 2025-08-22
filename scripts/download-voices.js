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

function createProgressBar(current, total, width = 40) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${colorize(bar, "cyan")}] ${percentage}%`;
}

// Update the downloadFile function to handle post-install context
async function downloadFile(
  url,
  filepath,
  filename,
  expectedSize,
  isPostInstall = false
) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const totalSize = parseInt(response.headers.get("content-length") || "0");
      let downloadedSize = 0;
      let lastProgressUpdate = 0;

      const fileStream = createWriteStream(filepath);

      if (isPostInstall) {
        // Simpler output for npm install
        const fileType = filename.endsWith(".json") ? "Config" : "Voice Model";
        console.log(
          colorize(
            `📥 Downloading ${fileType}: ${filename} (${expectedSize})`,
            "blue"
          )
        );
      } else {
        console.log(colorize(`\n📥 Downloading ${filename}...`, "blue"));
        const fileType = filename.endsWith(".json") ? "Config" : "Model";
        console.log(`   Type: ${fileType} | Size: ${expectedSize}`);
      }

      // Create a transform stream to track progress
      const progressStream = new (await import("stream")).Transform({
        transform(chunk, encoding, callback) {
          downloadedSize += chunk.length;

          // Throttle progress updates during npm install
          const now = Date.now();
          const shouldUpdate = isPostInstall
            ? now - lastProgressUpdate > 1000 // Update every second during install
            : true; // Update every chunk normally

          if (shouldUpdate && totalSize > 0) {
            lastProgressUpdate = now;
            const progressBar = createProgressBar(downloadedSize, totalSize);
            const downloaded = formatBytes(downloadedSize);
            const total = formatBytes(totalSize);

            if (isPostInstall) {
              // Less verbose output for npm install
              const percentage = Math.round((downloadedSize / totalSize) * 100);
              process.stdout.write(
                `\r   Progress: ${percentage}% (${downloaded}/${total})`
              );
            } else {
              process.stdout.write(
                `\r   ${progressBar} ${downloaded}/${total}`
              );
            }
          } else if (!totalSize) {
            process.stdout.write(
              `\r   Downloaded: ${formatBytes(downloadedSize)}`
            );
          }

          callback(null, chunk);
        },
      });

      await streamPipeline(response.body, progressStream, fileStream);

      if (isPostInstall) {
        console.log(
          colorize(`\n   ✅ ${filename} downloaded successfully`, "green")
        );
      } else {
        console.log(
          colorize(`\n   ✅ Successfully downloaded ${filename}`, "green")
        );
      }
      resolve();
    } catch (error) {
      console.log(
        colorize(
          `\n   ❌ Failed to download ${filename}: ${error.message}`,
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
    console.log(colorize(`\nVoices directory: ${voicesDir}`, "yellow"));
  }

  const { existing, missing } = checkExistingVoices(voicesDir);

  // ... rest of the function logic with isPostInstall checks ...

  // In the download loop:
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    if (!isPostInstall) {
      console.log(
        colorize(
          `\n[${i + 1}/${filesToDownload.length}] ${
            file.voiceName || "Unknown"
          }`,
          "magenta"
        )
      );
    }

    try {
      await downloadFile(
        file.url,
        file.filepath,
        file.filename,
        file.size,
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

  downloadVoices(force, true).catch((error) => {
    console.error(colorize(`\n❌ Download failed: ${error.message}`, "red"));
    process.exit(1);
  });
}
