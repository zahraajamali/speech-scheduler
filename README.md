# Piper Announce

AI-powered announcement generator using Piper TTS and OpenAI GPT models.

## Prerequisites

- Node.js 16+
- Piper TTS binary installed and in PATH
- FFmpeg for audio processing
- OpenAI API key

## Installation

### Global Installation

```bash
npm install -g piper-announce
```

### Local Installation

```bash
npm install piper-announce
```

## Setup

1. Install Piper TTS:

   ```bash
   # On macOS with Homebrew
   brew install piper-tts

   # Or download from: https://github.com/rhasspy/piper
   ```

2. Download voice models and place them in a `voices/` directory

3. Set environment variables:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export PIPER_BIN="piper"  # or path to piper binary
   export VOICES_DIR="./voices"  # path to your voice files
   ```

## Usage

### Command Line

Create an `input.json` file:

```json
{
  "text": "Welcome to our store! We have special offers today.",
  "lang": "en",
  "gender": "female",
  "style": "friendly",
  "custom_style": null,
  "master": true,
  "export_formats": ["mp3", "m4a"]
}
```

Run:

```bash
make-announcement
```

### Programmatic Usage

```javascript
import { makeAnnouncement } from "piper-announce";

const result = await makeAnnouncement(
  "Welcome to our store!",
  "en",
  "female",
  "friendly",
  {
    master: true,
    exportFormats: ["mp3"],
  }
);

console.log(result.text); // Generated announcement text
console.log(result.audio); // Path to audio file
console.log(result.extras); // Additional format files
```

## Supported Languages & Voices

- **English (en)**: female, male
- **Spanish (es)**: female, male
- **Catalan (ca)**: female, male

## Styles

- `friendly`: Warm, welcoming, upbeat
- `formal`: Polite, concise, professional
- `urgent`: Direct, time-sensitive
- `custom`: Use custom style description

## API Reference

### makeAnnouncement(text, language, gender, style, options)

- **text** (string): The text to convert to announcement
- **language** (string): Language code ('en', 'es', 'ca')
- **gender** (string): Voice gender ('female', 'male')
- **style** (string): Announcement style ('friendly', 'formal', 'urgent', 'custom')
- **options** (object): Optional settings
  - `customStyle` (string): Custom style description when style is 'custom'
  - `master` (boolean): Apply audio mastering (default: true)
  - `exportFormats` (array): Additional formats to export ['mp3', 'm4a', 'opus']

Returns an object with:

- `text`: The generated announcement text
- `audio`: Path to the main audio file
- `extras`: Object with paths to additional format files

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PIPER_BIN`: Path to Piper binary (default: "piper")
- `VOICES_DIR`: Directory containing voice model files

## Voice Models

You'll need to download voice model files (.onnx) for each language and gender:

### English

- Female: `en_GB-jenny_dioco-medium.onnx`
- Male: `en_GB-alan-low.onnx`

### Spanish

- Female: `es_ES-mls_10246-low.onnx`
- Male: `es_ES-carlfm-x_low.onnx`

### Catalan

- Female: `ca_ES-upc_ona-x_low.onnx`
- Male: `ca_ES-upc_pau-x_low.onnx`

Download from: https://github.com/rhasspy/piper/releases

## License

MIT
