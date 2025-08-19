# Piper Announce 🎙️

AI-powered announcement generator that combines OpenAI's GPT models with Piper TTS to create professional-quality audio announcements in multiple languages and styles.

## Features ✨

- **AI-Powered Text Generation**: Uses OpenAI GPT-4o-mini to create polished announcements from your input
- **Multiple Languages**: Support for English, Spanish, Catalan, and Farsi
- **Voice Options**: Male and female voices for each supported language
- **Style Presets**: Friendly, formal, urgent, or custom styles
- **Professional Audio Processing**: Automatic mastering with loudness normalization and filtering
- **Multiple Export Formats**: WAV, MP3, M4A, and Opus support
- **Safe Content**: Automatically transforms inappropriate requests into safe, inclusive announcements

## Quick Start 🚀

### Prerequisites

- Node.js 16+
- [Piper TTS](https://github.com/rhasspy/piper) installed and accessible in PATH
- FFmpeg for audio processing
- OpenAI API key

### Installation

1. **Clone the repository**:

```bash
git clone https://github.com/zahraajamali/speech-scheduler.git
cd speech-scheduler
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables**:
   Create a `.env` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PIPER_BIN=piper  # Optional: path to piper binary
VOICES_DIR=/path/to/voices  # Optional: custom voices directory
```

4. **Download voice models**:
   You'll need to download Piper voice models. The script will look for voices in these locations:

- `$VOICES_DIR` (if set)
- `./voices/`
- `../voices/`
- `~/.piper/voices/`

Expected voice files:

```
voices/
├── en_GB-jenny_dioco-medium.onnx    # English female
├── en_GB-alan-low.onnx              # English male
├── es_ES-mls_10246-low.onnx         # Spanish female
├── es_ES-carlfm-x_low.onnx          # Spanish male
├── ca_ES-upc_ona-x_low.onnx         # Catalan female
└── ca_ES-upc_pau-x_low.onnx         # Catalan male
```

Download voices from the [Piper voices repository](https://github.com/rhasspy/piper/releases).

## Usage 📝

### CLI Usage

Create an `input.json` file:

```json
{
  "text": "Welcome to our store! We have a special promotion today.",
  "lang": "en",
  "gender": "female",
  "style": "friendly",
  "master": true,
  "export_formats": ["mp3", "m4a"]
}
```

Run the generator:

```bash
npm start
```

### Programmatic Usage

```javascript
import { makeAnnouncement } from "./src/index.js";

const result = await makeAnnouncement(
  "Please attention, the store will close in 10 minutes",
  "en", // language
  "female", // gender
  "urgent", // style
  {
    master: true, // apply audio mastering
    exportFormats: ["mp3", "opus"], // additional formats
  }
);

console.log(`Generated: "${result.text}"`);
console.log(`Audio file: ${result.audio}`);
console.log(`Additional formats:`, result.extras);
```

## Configuration Options ⚙️

### Languages

- `en` - English (UK voices)
- `es` - Spanish (Spain)
- `ca` - Catalan

### Genders

- `female` - Female voice
- `male` - Male voice

### Styles

- `friendly` - Warm, welcoming, upbeat tone
- `formal` - Polite, concise, professional tone
- `urgent` - Direct, time-sensitive with clear call-to-action
- `custom` - Provide your own style description

### Audio Processing

The tool automatically applies professional audio mastering:

- Loudness normalization (-16 LUFS)
- High-pass filter (80Hz)
- Low-pass filter (12kHz)
- Silence removal
- Format conversion to 48kHz 16-bit

### Export Formats

- `wav` - Uncompressed audio (default)
- `mp3` - MP3 compression (quality 2)
- `m4a` - AAC compression (192kbps)
- `opus` - Opus compression (96kbps)

## Input.json Schema 📋

```jsonc
{
  "text": "string", // Your announcement text
  "lang": "en|es|ca", // Language code
  "gender": "male|female", // Voice gender
  "style": "friendly|formal|urgent|custom", // Style preset
  "custom_style": "string", // Custom style description (when style="custom")
  "master": true, // Apply audio mastering (default: true)
  "export_formats": ["mp3"] // Additional export formats
}
```

## Examples 🎯

### Friendly Store Announcement

```json
{
  "text": "We have fresh pastries available at the bakery counter",
  "lang": "en",
  "gender": "female",
  "style": "friendly"
}
```

Generated: _"We have delicious fresh pastries available at our bakery counter. Come and try them while they're still warm!"_

### Urgent Safety Notice

```json
{
  "text": "Fire alarm test will begin",
  "lang": "en",
  "gender": "male",
  "style": "urgent"
}
```

Generated: _"Attention: Fire alarm testing will begin in 2 minutes. Please remain calm and continue with your activities!"_

### Multilingual Support

```json
{
  "text": "La tienda cerrará en 30 minutos",
  "lang": "es",
  "gender": "female",
  "style": "formal"
}
```

## Project Structure 📁

```
speech-scheduler/
├── src/
│   └── index.js          # Main announcement generator
├── bin/
│   └── make-announcement # CLI executable
├── examples/
│   └── basic-usage.js    # Usage examples
├── voices/               # Voice model directory
├── input.json           # Input configuration
├── package.json
├── .env                 # Environment variables
└── README.md
```

## Troubleshooting 🔧

### Common Issues

**"Missing voice for language"**

- Download the required voice models from Piper releases
- Check that voice files are in the correct directory
- Verify file permissions

**"Piper error"**

- Ensure Piper is installed and in PATH
- Check that voice model files aren't corrupted
- Verify text encoding (UTF-8)

**"ffmpeg mastering error"**

- Install FFmpeg and ensure it's in PATH
- Check write permissions in output directory

**OpenAI API errors**

- Verify your API key is correct
- Check your OpenAI account has sufficient credits
- Ensure internet connectivity

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- [Piper TTS](https://github.com/rhasspy/piper) - High-quality neural text-to-speech
- [OpenAI](https://openai.com/) - AI text generation
- Voice models from the Piper community

## Support 💬

If you encounter issues or have questions:

1. Check the [Issues](https://github.com/zahraajamali/speech-scheduler/issues) page
2. Create a new issue with detailed information
3. Include your configuration and error messages

---

Made with ❤️ for creating better audio announcements
