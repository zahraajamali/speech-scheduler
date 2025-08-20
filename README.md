# Piper Announce

🎵 AI-powered announcement generator using Piper TTS and OpenAI GPT models with **automatic voice model downloads**.

## ✨ New in v1.2.0

- **🚀 Automatic Voice Downloads**: Voice models are now downloaded automatically during installation
- **📊 Progress Tracking**: See real-time download progress for each voice model
- **🔍 Voice Status Checking**: Check which voices are available with built-in commands
- **⚡ Smart Error Handling**: Helpful suggestions when voice models are missing

## Features

- **AI-Powered Text Generation**: Transform your ideas into polished announcements using OpenAI GPT
- **High-Quality TTS**: Generate natural-sounding speech with Piper neural voices
- **Multiple Languages**: Support for English, Spanish, and Catalan
- **Voice Variety**: Male and female voices for each language
- **Style Presets**: Choose from friendly, formal, urgent, or custom styles
- **Audio Mastering**: Professional audio processing with normalization and filtering
- **Multiple Formats**: Export to WAV, MP3, M4A, and Opus
- **Automatic Setup**: Voice models download automatically on installation

## Quick Start

### Installation

```bash
npm install piper-announce
```

**That's it!** Voice models will download automatically during installation. You'll see progress bars for each download:

```
🎵 Piper Announce Voice Downloader
==================================================

⬇️  Need to download (6):
   • en_GB-jenny_dioco-medium.onnx (English (GB), Female, 63MB)
   • en_GB-alan-low.onnx (English (GB), Male, 22MB)
   • es_ES-mls_10246-low.onnx (Spanish (ES), Female, 22MB)
   • es_ES-carlfm-x_low.onnx (Spanish (ES), Male, 9MB)
   • ca_ES-upc_ona-x_low.onnx (Catalan (ES), Female, 9MB)
   • ca_ES-upc_pau-x_low.onnx (Catalan (ES), Male, 9MB)

📥 Downloading en_GB-jenny_dioco-medium.onnx...
   [████████████████████████████████████████] 100% 63.2MB/63.2MB
   ✅ Successfully downloaded en_GB-jenny_dioco-medium.onnx
```

### Prerequisites

You'll need these tools installed:

- **Node.js** 16+
- **Piper TTS** - Install from [rhasspy/piper](https://github.com/rhasspy/piper)
- **FFmpeg** - For audio processing and format conversion
- **OpenAI API Key** - Set as `OPENAI_API_KEY` environment variable

## Voice Management

### Check Voice Status

```bash
npm run check-voices
```

This shows which voice models are available:

```
📊 Voice Model Status:
═══════════════════════════════════════════════

English (GB) (en):
  Female: ✅ Available
  Male: ✅ Available

Spanish (ES) (es):
  Female: ✅ Available
  Male: ❌ Missing

💡 To download missing voices:
   npm run download-voices
```

### Manual Voice Downloads

```bash
# Download missing voices only
npm run download-voices

# Re-download all voices (force)
npm run download-voices:force
```

### Skip Automatic Downloads

Set environment variables to skip automatic downloads:

```bash
# Skip during CI/CD
export CI=true

# Skip manually
export SKIP_VOICE_DOWNLOAD=true
npm install piper-announce
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

console.log(text); // "The library will be closing in 15 minutes. Please gather your belongings and head to the checkout desk."

// Step 2: Generate audio
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

### Check Voice Availability Programmatically

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

### Advanced Usage

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
  master: true, // Apply audio mastering
  exportFormats: ["mp3", "opus"],
  keepWav: false, // Delete WAV after conversion
});
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
VOICES_DIR=/path/to/voices          # Custom voices directory
PIPER_BIN=/path/to/piper           # Custom Piper binary path
SKIP_VOICE_DOWNLOAD=true           # Skip automatic voice download
```

### Supported Languages & Voices

| Language     | Code | Female Voice | Male Voice | Quality    |
| ------------ | ---- | ------------ | ---------- | ---------- |
| English (GB) | `en` | jenny_dioco  | alan       | Medium/Low |
| Spanish (ES) | `es` | mls_10246    | carlfm     | Low/X-Low  |
| Catalan (ES) | `ca` | upc_ona      | upc_pau    | X-Low      |

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

Convert text to high-quality speech.

**Parameters:**

- `text` (string) - Text to synthesize
- `options` (object)
  - `language` (string) - Language code: 'en', 'es', 'ca'
  - `gender` (string) - Voice gender: 'female', 'male'
  - `style` (string) - Audio style preset
  - `master` (boolean) - Apply audio mastering (default: true)
  - `exportFormats` (array) - Additional formats: ['mp3', 'm4a', 'opus']
  - `keepWav` (boolean) - Keep WAV file (default: false)

**Returns:** Object with `text`, `audio`, and `extras` properties

### `getVoiceStatus()`

Check voice model availability.

**Returns:** Object with `availability` and `missingVoices` properties

## Voice Models

Voice models are automatically downloaded from Hugging Face's [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) repository. Total download size is approximately ~134MB for all voices.

### Manual Voice Management

If you need to manage voices manually:

```bash
# Check what's available
node -e "import('./src/index.js').then(m => console.log(m.getVoiceStatus()))"

# Download missing voices
npm run download-voices

# Force re-download all
npm run download-voices:force
```

## Troubleshooting

### Voice Download Issues

If voice downloads fail during installation:

```bash
# Retry voice downloads
npm run download-voices

# Check your internet connection and try again
npm run download-voices:force

# Check voice status
node examples/voice-status.js
```

### Common Issues

**"Missing voice for language/gender"**

```bash
npm run download-voices
```

**"Piper command not found"**

```bash
# Install Piper TTS first
# See: https://github.com/rhasspy/piper
```

**"FFmpeg command not found"**

```bash
# Install FFmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from https://ffmpeg.org
```

## Examples

Check the `examples/` directory:

- `examples/basic-usage.js` - Basic text generation and synthesis
- `examples/voice-status.js` - Check voice availability
- `examples/batch-announcements.js` - Generate multiple announcements

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.2.0

- ✨ Added automatic voice model downloads during installation
- 📊 Added progress tracking for downloads
- 🔍 Added voice status checking functionality
- ⚡ Improved error messages with helpful suggestions
- 🛠️ Enhanced API with `getVoiceStatus()` function

### v1.1.2

- 🎵 Initial release with manual voice setup
- 🤖 AI-powered text generation
- 🗣️ Multi-language TTS support
- 🎛️ Audio mastering and format conversion
