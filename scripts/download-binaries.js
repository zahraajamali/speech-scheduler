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

// Piper TTS binary releases configuration
const PIPER_BINARIES = {
  "linux-x64": {
    url: "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_linux_x86_64.tar.gz",
    filename: "piper_linux_x86_64.tar.gz",
    executable: "piper/piper",
    size: "45MB",
  },
  "win32-x64": {
    url: "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_windows_amd64.zip",
    filename: "piper_windows_amd64.zip",
    executable: "piper/piper.exe",
    size: "42MB",
  },
  "darwin-x64": {
    url: "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_macos_x86_64.tar.gz",
    filename: "piper_macos_x86_64.tar.gz",
    executable: "piper/piper",
    size: "48MB",
  },
  "darwin-arm64": {
    url: "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_macos_aarch64.tar.gz",
    filename: "piper_macos_aarch64.tar.gz",
    executable: "piper/piper",
    size: "46MB",
  },
};

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function downloadAndExtract(platform, config) {
  const binariesDir = path.join(__dirname, "..", "binaries");
  const platformDir = path.join(binariesDir, platform);
  const archivePath = path.join(platformDir, config.filename);

  // Create directories
  fs.mkdirSync(platformDir, { recursive: true });

  console.log(
    colorize(`📥 Downloading ${platform} binary (${config.size})...`, "blue")
  );

  try {
    // Download the archive
    const response = await fetch(config.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const fileStream = createWriteStream(archivePath);
    await streamPipeline(response.body, fileStream);

    console.log(colorize(`✅ Downloaded ${config.filename}`, "green"));

    // Extract archive
    console.log(colorize(`📦 Extracting ${config.filename}...`, "yellow"));

    if (config.filename.endsWith(".tar.gz")) {
      const tar = await import("tar");
      await tar.extract({
        file: archivePath,
        cwd: platformDir,
        strip: 0,
      });
    } else if (config.filename.endsWith(".zip")) {
      const yauzl = await import("yauzl");
      await extractZip(archivePath, platformDir);
    }

    // Make executable on Unix-like systems
    if (platform.startsWith("linux") || platform.startsWith("darwin")) {
      const executablePath = path.join(platformDir, config.executable);
      if (fs.existsSync(executablePath)) {
        fs.chmodSync(executablePath, "755");
        console.log(
          colorize(`🔧 Made ${config.executable} executable`, "cyan")
        );
      }
    }

    // Clean up archive
    fs.unlinkSync(archivePath);
    console.log(colorize(`🗑️  Cleaned up ${config.filename}`, "cyan"));
  } catch (error) {
    console.error(
      colorize(`❌ Failed to download ${platform}: ${error.message}`, "red")
    );
    throw error;
  }
}

async function extractZip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    import("yauzl")
      .then((yauzl) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
          if (err) return reject(err);

          zipfile.readEntry();
          zipfile.on("entry", (entry) => {
            if (/\/$/.test(entry.fileName)) {
              // Directory entry
              zipfile.readEntry();
            } else {
              // File entry
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) return reject(err);

                const filePath = path.join(extractDir, entry.fileName);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });

                const writeStream = createWriteStream(filePath);
                readStream.pipe(writeStream);
                writeStream.on("close", () => {
                  zipfile.readEntry();
                });
              });
            }
          });

          zipfile.on("end", () => {
            resolve();
          });
        });
      })
      .catch(reject);
  });
}

async function downloadAllBinaries() {
  console.log(colorize("\n🚀 Downloading Piper TTS Binaries", "bright"));
  console.log(colorize("=".repeat(50), "blue"));

  const platforms = Object.keys(PIPER_BINARIES);
  let success = 0;
  let failed = 0;

  for (const platform of platforms) {
    try {
      await downloadAndExtract(platform, PIPER_BINARIES[platform]);
      success++;
    } catch (error) {
      failed++;
      console.error(colorize(`Failed to download ${platform}`, "red"));
    }
    console.log(""); // Empty line between downloads
  }

  console.log(colorize("📊 Download Summary:", "bright"));
  console.log(colorize(`✅ Success: ${success}`, "green"));
  console.log(colorize(`❌ Failed: ${failed}`, "red"));

  if (success === platforms.length) {
    console.log(colorize("🎉 All binaries downloaded successfully!", "green"));
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllBinaries().catch(console.error);
}

export { downloadAllBinaries, PIPER_BINARIES };
