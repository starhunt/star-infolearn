# Star InfoLearn

[English](./README.md) | [한국어](./README_KO.md)

Turn notes into interactive learning cards with AI-assisted quizzes, cloze blanks, and review workflows.

## Features

- Generate learning cards from notes with AI assistance.
- Study with flashcards, multiple-choice questions, cloze blanks, and short answers.
- Schedule reviews with an FSRS-style spaced repetition workflow.
- Filter review sessions by current note, folder, or date range.
- Track progress in a local learning dashboard.

## Installation

### From Community Plugins

1. Open Settings → Community plugins.
2. Search for **Star InfoLearn**.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub release](https://github.com/starhunt/star-infolearn/releases/latest).
2. Create the plugin folder: `<vault>/.obsidian/plugins/star-infolearn/`.
3. Copy the downloaded files into that folder.
4. Restart the app or reload plugins, then enable **Star InfoLearn** in Community plugins.

### Build from source

```bash
git clone https://github.com/starhunt/star-infolearn.git
cd star-infolearn
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/star-infolearn/`.

## Usage

1. Enable **Star InfoLearn** in Community plugins.
2. Open the command palette or use the plugin ribbon/sidebar entry.
3. Configure provider keys, folders, templates, or review options in plugin settings as needed.
4. Run the relevant command for your workflow.

## Commands

- `Open Star InfoLearn`
- `Generate Flashcards`
- `Quick Generate with AI`

## Privacy and network use

Star InfoLearn sends selected note content only to the AI providers that you configure for learning-card generation. API keys are stored locally in plugin settings. The plugin does not collect telemetry.

## Platform

This plugin is available on desktop and mobile where supported by the host app and configured providers.

## License

MIT License. See [LICENSE](./LICENSE).
