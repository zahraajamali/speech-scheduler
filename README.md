# Piper Announce

AI-powered announcement generator with **bundled Piper TTS** - no external dependencies required.

## New in v1.3.0 - Zero Configuration Setup

- **Bundled Piper TTS**: No need to install Piper separately - it's included in the package
- **One-Command Installation**: Just `npm install piper-announce` and you're ready to go
- **Cross-Platform Support**: Works on Linux, macOS (Intel & Apple Silicon), and Windows
- **Automatic Downloads**: Voice models and binaries download automatically during installation
- **No System Dependencies**: Everything you need is bundled in the package

## Features

- **AI-Powered Text Generation**: Transform your ideas into polished announcements using OpenAI GPT
- **Bundled High-Quality TTS**: Generate natural-sounding speech with included Piper neural voices
- **Multiple Languages**: Support for English, Spanish, and Catalan
- **Voice Variety**: Male and female voices for each language
- **Style Presets**: Choose from friendly, formal, urgent, or custom styles
- **Audio Mastering**: Professional audio processing with normalization and filtering
- **Multiple Formats**: Export to WAV, MP3, M4A, and Opus
- **Zero Configuration**: Everything works out of the box

## Quick Start

### Installation

```bash
npm install piper-announce
```

**That's it!** The package includes everything you need:

- Piper TTS binaries for your platform
- Voice models download automatically
- No additional setup required

During installation, you'll see:

```
📦 Downloading Piper binary for linux-x64...
✅ Piper binary downloaded successfully!
🎤 Downloading voice models...
📥 Downloading Voice Model: en_GB-jenny_dioco-medium.onnx (63MB)
   Progress: 100% (63.2MB/63.2MB)
   ✅ en_GB-jenny_dioco-medium.onnx downloaded successfully
🎉 Piper Announce setup complete!
💡 No external Piper installation required!
```

### Prerequisites

Minimal requirements:

- **Node.js** 16+
- **OpenAI API Key** - Set as `OPENAI_API_KEY` environment variable
- **FFmpeg** (optional) - Only needed for audio format conversion and mastering

**No Piper installation required** - it's bundled with the package!

### Environment Setup

Create a `.env` file or set environment variables:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
VOICES_DIR=/path/to/voices           # Custom voices directory
SKIP_VOICE_DOWNLOAD=true            # Skip automatic voice download (CI environments)
SKIP_BINARY_DOWNLOAD=true           # Skip binary download (testing/CI)
```

## Usage

### Basic Example

```javascript
import { generateAnnouncementText, makeAnnouncement } from "piper-announce";

// Step 1: Generate announcement text
const text = await generateAnnouncementText(
  "The library will close in 15 minutes",
  {
    language: "en",
    style: "friendly",
  }
);

console.log(text);
// "The library will be closing in 15 minutes. Please gather your belongings and head to the checkout desk."

// Step 2: Generate audio (uses bundled Piper TTS)
const result = makeAnnouncement(text, {
  language: "en",
  gender: "female",
  style: "friendly",
  exportFormats: ["mp3", "m4a"],
});

console.log(result);
// {
//   text: "The library will be closing in 15 minutes...",
//   audio: "announcement_en_friendly_female_20241201123045.wav",
//   extras: {
//     mp3: "announcement_en_friendly_female_20241201123045.mp3",
//     m4a: "announcement_en_friendly_female_20241201123045.m4a"
//   }
// }
```

### Check Voice Availability

```javascript
import { getVoiceStatus } from "piper-announce";

const { availability, missingVoices } = getVoiceStatus();

console.log(availability);
// {
//   en: { female: true, male: true },
//   es: { female: true, male: false },
//   ca: { female: true, male: true }
// }

if (missingVoices.length > 0) {
  console.log("Missing voices:", missingVoices);
}
```

## Voice Model Management

The package includes a `piper-voices` command for managing voice models:

**Check Voice Status**

```bash
piper-voices status
```

**Download Missing Voices**

```bash
piper-voices download
```

**Force Re-download All Voices**

```bash
piper-voices download --force
```

**Alternative: Use npx**

```bash
npx piper-voices status
npx piper-voices download
npx piper-voices download --force
```

## Platform Support

The package automatically detects your platform and uses the appropriate Piper binary:

| Platform | Architecture          | Binary Size | Status       |
| -------- | --------------------- | ----------- | ------------ |
| Linux    | x64                   | ~45MB       | ✅ Supported |
| Windows  | x64                   | ~42MB       | ✅ Supported |
| macOS    | Intel (x64)           | ~48MB       | ✅ Supported |
| macOS    | Apple Silicon (ARM64) | ~46MB       | ✅ Supported |

Unsupported platforms will show a helpful error message with manual installation instructions.

## Configuration

### Supported Languages & Voices

| Language     | Code | Female Voice | Male Voice | Quality    | Size |
| ------------ | ---- | ------------ | ---------- | ---------- | ---- |
| English (GB) | `en` | jenny_dioco  | alan       | Medium/Low | 85MB |
| Spanish (ES) | `es` | mls_10246    | carlfm     | Low/X-Low  | 31MB |
| Catalan (ES) | `ca` | upc_ona      | upc_pau    | X-Low      | 18MB |

### Style Options

- **`friendly`** - Warm, welcoming, upbeat tone
- **`formal`** - Polite, concise, professional tone
- **`urgent`** - Direct, time-sensitive with clear call-to-action
- **`custom`** - Specify your own style requirements

## API Reference

### `generateAnnouncementText(userText, options)`

Generate polished announcement text using AI.

**Parameters:**

- `userText` (string) - Your announcement request
- `options` (object)
  - `language` (string) - Language code: 'en', 'es', 'ca'
  - `style` (string) - Style: 'friendly', 'formal', 'urgent', 'custom'
  - `customStyle` (string) - Custom style description (when style='custom')

**Returns:** Promise<string> - Generated announcement text

### `makeAnnouncement(text, options)`

Convert text to high-quality speech using bundled Piper TTS.

**Parameters:**

- `text` (string) - Text to synthesize
- `options` (object)
  - `language` (string) - Language code: 'en', 'es', 'ca'
  - `gender` (string) - Voice gender: 'female', 'male'
  - `style` (string) - Audio style preset
  - `master` (boolean) - Apply audio mastering (default: true, requires FFmpeg)
  - `exportFormats` (array) - Additional formats: ['mp3', 'm4a', 'opus'] (requires FFmpeg)
  - `keepWav` (boolean) - Keep WAV file (default: false)

**Returns:** Object with `text`, `audio`, and `extras` properties

### `getVoiceStatus()`

Check voice model availability.

**Returns:** Object with `availability` and `missingVoices` properties

## Advanced Usage

### Custom Style with High-Quality Output

```javascript
import { generateAnnouncementText, makeAnnouncement } from "piper-announce";

// Custom style with specific requirements
const customText = await generateAnnouncementText("Fire drill in 5 minutes", {
  language: "en",
  style: "custom",
  customStyle: "Calm but authoritative, reassuring tone",
});

// High-quality audio with multiple formats
const result = makeAnnouncement(customText, {
  language: "en",
  gender: "male",
  style: "urgent",
  master: true, // Apply audio mastering (requires FFmpeg)
  exportFormats: ["mp3", "opus"], // Convert to additional formats (requires FFmpeg)
  keepWav: false, // Delete WAV after conversion
});
```

### Batch Processing

```javascript
import { makeAnnouncement } from "piper-announce";

const announcements = [
  { text: "Welcome to our store", lang: "en", voice: "female" },
  { text: "Bienvenidos a nuestra tienda", lang: "es", voice: "female" },
  { text: "Benvinguts a la nostra botiga", lang: "ca", voice: "male" },
];

for (const announcement of announcements) {
  const result = makeAnnouncement(announcement.text, {
    language: announcement.lang,
    gender: announcement.voice,
    style: "friendly",
  });
  console.log(`Generated: ${result.audio}`);
}
```

## Troubleshooting

### Common Issues

**"Bundled Piper binary not found"**
This usually means the binary download failed during installation. Try:

```bash
npm run download-binaries
```

**"Unsupported platform"**
Your platform isn't supported by the bundled binaries. The package will show instructions for manual Piper installation.

**"Voice model not available"**
Voice models failed to download during installation:

```bash
npm run download-voices
```

**"ffmpeg command not found"** (only affects audio mastering/format conversion)

```bash
# Install FFmpeg (optional - only needed for mastering/conversion)
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from https://ffmpeg.org
```

### Environment Variables for CI/Testing

```bash
# Skip downloads in CI environments
CI=true npm install

# Or manually skip specific downloads
SKIP_VOICE_DOWNLOAD=true npm install
SKIP_BINARY_DOWNLOAD=true npm install
```

### Manual Downloads

If automatic downloads fail:

```bash
# Download binaries manually
npm run download-binaries

# Download voice models manually
npm run download-voices

# Force re-download everything
npm run download-voices:force
```

## File Structure

After installation, your `node_modules/piper-announce` will contain:

```
piper-announce/
├── binaries/
│   ├── linux-x64/piper/piper
│   ├── win32-x64/piper/piper.exe
│   ├── darwin-x64/piper/piper
│   └── darwin-arm64/piper/piper
├── voices/
│   ├── en_GB-jenny_dioco-medium.onnx
│   ├── en_GB-alan-low.onnx
│   └── ...
├── src/
└── scripts/
```

## Package Size

Total package size varies by platform:

- **Base package**: ~2MB (code only)
- **+ Platform binary**: ~45MB (downloaded automatically)
- **+ All voice models**: ~134MB (downloaded automatically)
- **Total installed size**: ~180MB

Only the binary for your platform is downloaded, keeping the installation efficient.

## Examples

Check the `examples/` directory for complete examples:

- `examples/basic-usage.js` - Basic text generation and synthesis
- `examples/voice-status.js` - Check voice availability
- `examples/batch-announcements.js` - Generate multiple announcements
- `examples/platform-info.js` - Show platform detection and binary paths

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.3.0 - Bundled Piper TTS

- **Bundled Piper TTS**: No external Piper installation required
- **Cross-Platform Support**: Linux, macOS (Intel & ARM), Windows binaries included
- **Zero Configuration**: Everything works out of the box
- **Automatic Binary Downloads**: Platform-specific binaries download during installation
- **Improved Error Handling**: Better error messages and platform detection
- **Reduced Dependencies**: No longer requires system Piper installation

### v1.2.2

- Simplified Piper TTS installation using pip
- Updated documentation with pip installation instructions
- Enhanced environment variable configuration
- Improved troubleshooting guide

### v1.2.0

- Added automatic voice model downloads during installation
- Added progress tracking for downloads
- Added voice status checking functionality
- Improved error messages with helpful suggestions
- Enhanced API with `getVoiceStatus()` function

### v1.1.2

- Initial release with manual voice setup
- AI-powered text generation
- Multi-language TTS support
- Audio mastering and format conversion
