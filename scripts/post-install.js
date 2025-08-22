#!/usr/bin/env node
import { downloadVoices } from "./download-voices.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Force output to be visible during npm install
function forceOutput(message) {
  // Write to stderr (less likely to be buffered by npm)
  process.stderr.write(message + "\n");
  // Also try stdout
  process.stdout.write(message + "\n");
  // Force flush
  if (process.stdout.flush) process.stdout.flush();
  if (process.stderr.flush) process.stderr.flush();
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

async function postInstallSetup() {
  // Force initial output
  forceOutput("");
  forceOutput(colorize("🎵 Setting up Piper Announce...", "bright"));

  // Check if this is a CI environment or if user wants to skip download
  const isCI = process.env.CI || process.env.CONTINUOUS_INTEGRATION;
  const skipDownload = process.env.SKIP_VOICE_DOWNLOAD === "true";

  if (isCI) {
    forceOutput(
      colorize(
        "⚠️  CI environment detected - skipping voice download",
        "yellow"
      )
    );
    forceOutput(
      colorize('💡 Run "piper-voices download" after installation', "cyan")
    );
    return;
  }

  if (skipDownload) {
    forceOutput(
      colorize(
        "⚠️  Voice download skipped (SKIP_VOICE_DOWNLOAD=true)",
        "yellow"
      )
    );
    forceOutput(
      colorize('💡 Run "piper-voices download" after installation', "cyan")
    );
    return;
  }

  const voicesDir = findVoicesDir();
  forceOutput(colorize(`📂 Voices directory: ${voicesDir}`, "cyan"));

  try {
    forceOutput(colorize("🚀 Downloading voice models...", "blue"));
    forceOutput(
      colorize("   This may take a few minutes on first install.", "yellow")
    );
    forceOutput(colorize("   Progress will be shown below:", "cyan"));
    forceOutput("");

    // Create a custom download function with better npm-compatible progress
    await downloadVoicesForNpm();

    forceOutput("");
    forceOutput(colorize("✅ Piper Announce setup complete!", "green"));
    forceOutput(
      colorize(
        "💡 Use 'piper-voices status' to check voice availability",
        "cyan"
      )
    );
  } catch (error) {
    forceOutput(colorize(`❌ Setup failed: ${error.message}`, "red"));
    forceOutput(
      colorize("💡 You can download voices manually later:", "yellow")
    );
    forceOutput(colorize("   piper-voices download", "cyan"));

    // Don't fail the installation - just warn the user
    process.exit(0);
  }
}

// Custom download function optimized for npm postinstall
async function downloadVoicesForNpm() {
  const { checkExistingVoices, VOICE_MODELS } = await import(
    "./download-voices.js"
  );

  const voicesDir = findVoicesDir();
  const { missing } = checkExistingVoices(voicesDir);

  if (missing.length === 0) {
    forceOutput(colorize("✅ All voice models already available!", "green"));
    return;
  }

  // Prepare download list
  const filesToDownload = [];
  missing.forEach(({ voiceName, missingFiles }) => {
    missingFiles.forEach((file) => {
      filesToDownload.push({ ...file, voiceName });
    });
  });

  let totalSizeMB = 0;
  filesToDownload.forEach((file) => {
    const sizeNum = parseFloat(file.size);
    if (file.size.includes("MB")) {
      totalSizeMB += sizeNum;
    } else if (file.size.includes("KB")) {
      totalSizeMB += sizeNum / 1024;
    }
  });

  forceOutput(
    colorize(
      `📦 Downloading ${filesToDownload.length} voice files (~${Math.round(
        totalSizeMB
      )}MB)`,
      "cyan"
    )
  );

  let successCount = 0;
  let failCount = 0;

  // Download files with npm-friendly progress reporting
  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];

    forceOutput(
      colorize(`[${i + 1}/${filesToDownload.length}] ${file.filename}`, "blue")
    );

    try {
      await downloadFileForNpm(
        file.url,
        file.filepath,
        file.filename,
        file.size
      );
      successCount++;
      forceOutput(colorize(`   ✅ Complete`, "green"));
    } catch (error) {
      failCount++;
      forceOutput(colorize(`   ❌ Failed: ${error.message}`, "red"));

      // Clean up partial download
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch {}
    }
  }

  // Final summary
  if (successCount > 0) {
    forceOutput(
      colorize(`✅ Successfully downloaded ${successCount} files`, "green")
    );
  }
  if (failCount > 0) {
    forceOutput(colorize(`❌ Failed to download ${failCount} files`, "red"));
  }
}

// Download function optimized for npm postinstall visibility
async function downloadFileForNpm(url, filepath, filename, expectedSize) {
  const { createWriteStream } = await import("fs");
  const { pipeline } = await import("stream");
  const { promisify } = await import("util");

  const streamPipeline = promisify(pipeline);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0");
    let downloadedSize = 0;
    let lastReportedPercent = 0;

    const fileStream = createWriteStream(filepath);

    // Create progress reporting stream
    const progressStream = new (await import("stream")).Transform({
      transform(chunk, encoding, callback) {
        downloadedSize += chunk.length;

        if (totalSize > 0) {
          const percent = Math.floor((downloadedSize / totalSize) * 100);

          // Report every 25% to avoid spam but show progress
          if (percent >= lastReportedPercent + 25 && percent <= 100) {
            const downloaded = formatBytes(downloadedSize);
            const total = formatBytes(totalSize);
            forceOutput(`   ${percent}% (${downloaded}/${total})`);
            lastReportedPercent = percent;
          }
        }

        callback(null, chunk);
      },
    });

    await streamPipeline(response.body, progressStream, fileStream);
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Run the post-install setup
postInstallSetup().catch((error) => {
  forceOutput(colorize(`❌ Post-install failed: ${error.message}`, "red"));
  forceOutput(colorize("💡 You can download voices manually later:", "yellow"));
  forceOutput(colorize("   piper-voices download", "cyan"));
  // Don't fail the installation
  process.exit(0);
});
