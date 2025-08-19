# Piper Announce 🎙️

AI-powered announcement generator that combines OpenAI's GPT models with Piper TTS to create professional-quality audio announcements in multiple languages and styles.

[![npm version](https://badge.fury.io/js/piper-announce.svg)](https://badge.fury.io/js/piper-announce)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features ✨

- **AI-Powered Text Generation**: Uses OpenAI GPT-4o-mini to create polished announcements from your input
- **Multiple Languages**: Support for English, Spanish, Catalan, and Farsi
- **Voice Options**: Male and female voices for each supported language
- **Style Presets**: Friendly, formal, urgent, or custom styles
- **Professional Audio Processing**: Automatic mastering with loudness normalization and filtering
- **Multiple Export Formats**: WAV, MP3, M4A, and Opus support
- **Safe Content**: Automatically transforms inappropriate requests into safe, inclusive announcements

## Installation 📦

```bash
npm i piper-announce
```

### Prerequisites

- Node.js 16+
- [Piper TTS](https://github.com/rhasspy/piper) installed and accessible in PATH
- FFmpeg for audio processing
- OpenAI API key

## Quick Start 🚀

### Environment Setup

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
PIPER_BIN=piper # Optional: path to piper binary
VOICES_DIR=/path/to/voices # Optional: custom voices directory
```

### Basic Usage

```javascript
import { makeAnnouncement } from "piper-announce";

const result = await makeAnnouncement(
  "Welcome to our store! We have a special promotion today.",
  "en", // language
  "female", // gender
  "friendly", // style
  {
    master: true, // apply audio mastering
    exportFormats: ["mp3", "m4a"], // additional formats
  }
);

console.log(`Generated text: "${result.text}"`);
console.log(`Audio file: ${result.audio}`);
console.log(`Additional formats:`, result.extras);
```

## Configuration Options ⚙️

### Languages

| Code | Language        | Voices Available |
| ---- | --------------- | ---------------- |
| `en` | English (UK)    | Male, Female     |
| `es` | Spanish (Spain) | Male, Female     |
| `ca` | Catalan         | Male, Female     |

### Voice Genders

- `female` - Female voice
- `male` - Male voice

### Style Presets

| Style      | Description                                      |
| ---------- | ------------------------------------------------ |
| `friendly` | Warm, welcoming, upbeat tone                     |
| `formal`   | Polite, concise, professional tone               |
| `urgent`   | Direct, time-sensitive with clear call-to-action |
| `custom`   | Provide your own style description               |

### Export Formats

- `wav` - Uncompressed audio (default)
- `mp3` - MP3 compression (quality 2)
- `m4a` - AAC compression (192kbps)
- `opus` - Opus compression (96kbps)

## API Reference 📚

### `makeAnnouncement(text, lang, gender, style, options)`

Generates an AI-enhanced audio announcement.

#### Parameters

- `text` (string): Your announcement text
- `lang` (string): Language code (`en`, `es`, `ca`, `fa`)
- `gender` (string): Voice gender (`male`, `female`)
- `style` (string): Style preset (`friendly`, `formal`, `urgent`, `custom`)
- `options` (object, optional):
  - `master` (boolean): Apply audio mastering (default: `true`)
  - `exportFormats` (array): Additional export formats
  - `customStyle` (string): Custom style description (when style is `custom`)

#### Returns

Promise that resolves to:

```javascript
{
text: "Enhanced announcement text",
audio: "path/to/generated/audio.wav",
extras: ["path/to/audio.mp3", "path/to/audio.m4a"]
}
```

## Examples 🎯

### Friendly Store Announcement

```javascript
const result = await makeAnnouncement(
  "We have fresh pastries available at the bakery counter",
  "en",
  "female",
  "friendly"
);
// Generated: "We have delicious fresh pastries available at our bakery counter. Come and try them while they're still warm!"
```

### Urgent Safety Notice

```javascript
const result = await makeAnnouncement(
  "Fire alarm test will begin",
  "en",
  "male",
  "urgent"
);
// Generated: "Attention: Fire alarm testing will begin in 2 minutes. Please remain calm and continue with your activities!"
```

### Multilingual Support

```javascript
const result = await makeAnnouncement(
  "La tienda cerrará en 30 minutos",
  "es",
  "female",
  "formal"
);
```

### Custom Style

```javascript
const result = await makeAnnouncement(
  "New products have arrived",
  "en",
  "female",
  "custom",
  {
    customStyle:
      "Excited and energetic, like a radio DJ announcing something amazing",
  }
);
```

## Voice Model Setup 🎤

Download Piper voice models from the [official releases](https://github.com/rhasspy/piper/releases).

Expected voice file structure:

```
voices/
├── en_GB-jenny_dioco-medium.onnx # English female
├── en_GB-alan-low.onnx # English male
├── es_ES-mls_10246-low.onnx # Spanish female
├── es_ES-carlfm-x_low.onnx # Spanish male
├── ca_ES-upc_ona-x_low.onnx # Catalan female
└── ca_ES-upc_pau-x_low.onnx # Catalan male
```

The library searches for voices in:

1. `$VOICES_DIR` (if set)
2. `./voices/`
3. `../voices/`
4. `~/.piper/voices/`

## Audio Processing 🎵

The library automatically applies professional audio mastering:

- **Loudness normalization** (-16 LUFS)
- **High-pass filter** (80Hz) - removes low-frequency noise
- **Low-pass filter** (12kHz) - removes high-frequency artifacts
- **Silence removal** - trims quiet sections
- **Format conversion** - 48kHz 16-bit output

## Troubleshooting 🔧

### Common Issues

**"Missing voice for language"**

- Download the required voice models from Piper releases
- Check that voice files are in the correct directory
- Verify file permissions

**"Piper error"**

- Ensure Piper is installed and in PATH: `piper --help`
- Check that voice model files aren't corrupted
- Verify text encoding (UTF-8)

**"ffmpeg mastering error"**

- Install FFmpeg: `ffmpeg -version`
- Check write permissions in output directory

**OpenAI API errors**

- Verify your API key is correct
- Check your OpenAI account has sufficient credits
- Ensure internet connectivity

### Debug Mode

Set environment variable for verbose logging:

```bash
DEBUG=piper-announce npm start
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](https://github.com/zahraajamali/speech-scheduler/blob/HEAD/LICENSE) file for details.

## Links 🔗

- **Repository**: [github.com/zahraajamali/speech-scheduler](https://github.com/zahraajamali/speech-scheduler)
- **NPM Package**: [npmjs.com/package/piper-announce](https://www.npmjs.com/package/piper-announce)
- **Issues**: [github.com/zahraajamali/speech-scheduler/issues](https://github.com/zahraajamali/speech-scheduler/issues)

## Acknowledgments 🙏

- [Piper TTS](https://github.com/rhasspy/piper) - High-quality neural text-to-speech
- [OpenAI](https://openai.com/) - AI text generation
- Voice models from the Piper community

---

Made with ❤️ for creating better audio announcements
