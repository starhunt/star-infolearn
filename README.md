# InfoLearn Pro - Advanced Infographic Learning Tool for Obsidian

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Obsidian-purple)

## 📚 Overview

InfoLearn Pro is an innovative Obsidian plugin that revolutionizes how you learn from infographics and technical documents. It combines AI-powered analysis with interactive learning techniques to dramatically improve information retention and comprehension.

### Key Features

- **📝 Blanking Mode**: Interactive fill-in-the-blank exercises with AI-powered keyword identification
- **✏️ Rewriting Mode**: Rewrite content in 6 different styles (Summary, Detailed, Beginner, Expert, Story, Report)
- **🔗 Association Mode**: Build knowledge graphs by creating meaningful connections between concepts
- **🤖 Multi-AI Support**: OpenAI, Anthropic, Gemini, Grok, Zhipu GLM-4.7

## 🚀 Installation

### From Obsidian Community Plugins
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "InfoLearn Pro"
4. Click Install

### Manual Installation
1. Download the latest release from GitHub
2. Extract to `.obsidian/plugins/infolearn-pro/`
3. Reload Obsidian
4. Enable the plugin in Settings

## 🎯 Getting Started

### 1. Configure AI Providers

1. Open InfoLearn Pro settings
2. Select your preferred AI provider
3. Enter your API key
4. Click "Test Connection" to verify

**Supported Providers:**
- **OpenAI**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Google Gemini**: Gemini 2.0 Flash, Pro, Ultra
- **xAI Grok**: Grok-3, Grok-2, Grok-1
- **Zhipu GLM**: GLM-4.7 (코딩플랜), GLM-4, GLM-3

### 2. Use Blanking Mode

1. Select text from your infographic or document
2. Click "Blanking" mode
3. AI automatically identifies key terms
4. Fill in the blanks and get instant feedback
5. Track your accuracy and progress

### 3. Use Rewriting Mode

1. Select text you want to rewrite
2. Click "Rewriting" mode
3. Choose from 6 different writing styles
4. Compare original and rewritten versions
5. Copy your preferred version

### 4. Use Association Mode

1. Click "Association" mode
2. Create new links between concepts
3. Define relationship types (related, causes, explains, example, contrast)
4. Build your knowledge graph
5. Visualize connections

## 🏗️ Architecture

### Project Structure

```
src/
├── types/
│   ├── ai.ts                    # AI service types
│   ├── blanking.ts              # Blanking feature types
│   ├── rewriting.ts             # Rewriting feature types
│   └── association.ts           # Association feature types
├── services/
│   ├── AIService.ts             # Multi-AI provider support
│   ├── DataService.ts           # Local data persistence
│   ├── TextExtractorService.ts  # Text extraction from PDFs/images
│   ├── BlankingService.ts       # Blanking feature logic
│   ├── RewritingService.ts      # Rewriting feature logic
│   └── AssociationService.ts    # Association feature logic
├── ui/
│   ├── MainContainer.tsx        # Main UI orchestrator
│   ├── BlankingView.tsx         # Blanking UI component
│   ├── RewritingView.tsx        # Rewriting UI component
│   ├── AssociationView.tsx      # Association UI component
│   ├── AISettingsPanel.tsx      # Settings UI component
│   └── InfoLearnView.ts         # Obsidian view integration
├── store/
│   └── appStore.ts              # Zustand global state management
└── styles/
    ├── main.css                 # Main container styles
    ├── blanking.css             # Blanking feature styles
    ├── rewriting.css            # Rewriting feature styles
    ├── association.css          # Association feature styles
    └── settings.css             # Settings panel styles
```

### Technology Stack

- **Language**: TypeScript
- **Build Tool**: esbuild
- **State Management**: Zustand
- **UI Framework**: React (optional, for future web version)
- **API Integration**: Axios
- **Data Storage**: Obsidian Vault

## 🔧 Development

### Prerequisites

- Node.js 16+
- npm or pnpm
- Obsidian 0.15.0+

### Setup

```bash
# Install dependencies
npm install

# Build plugin
npm run build

# Development mode (watch)
npm run dev
```

### Project Configuration

- **TypeScript**: `tsconfig.json`
- **Build**: `esbuild.config.mjs`
- **Manifest**: `manifest.json`
- **Package**: `package.json`

## 📊 Features in Detail

### Blanking Mode

- **AI Keyword Identification**: Automatically identifies 5-10 key learning terms
- **Interactive Quiz**: Fill-in-the-blank exercises with real-time validation
- **Progress Tracking**: Accuracy percentage and detailed feedback
- **Spaced Repetition**: Automatic scheduling for optimal retention

### Rewriting Mode

- **6 Writing Styles**:
  - 📋 Summary: Concise 2-3 sentence overview
  - 📚 Detailed: Comprehensive explanation with examples
  - 🌱 Beginner: Simple terms for beginners
  - 🎓 Expert: Advanced analysis and insights
  - 📖 Story: Engaging narrative format
  - 📊 Report: Professional business format

- **Readability Analysis**: Automatic readability score calculation
- **Keyword Preservation**: Ensures important terms are maintained
- **Side-by-side Comparison**: View original and rewritten versions

### Association Mode

- **Relationship Types**:
  - 🔗 Related: General relationship
  - → Causes: Causal relationship
  - 💡 Explains: Definitional relationship
  - 📝 Example: Exemplification
  - ⚖️ Contrast: Contrasting relationship

- **Knowledge Graph**: Visualize concept connections
- **Strength Metrics**: Measure relationship strength (0-1)
- **Statistics**: Total links, unique notes, average strength, graph density

## 🔐 Privacy & Security

- **Local Storage**: All data stored locally in Obsidian vault
- **No Cloud Sync**: Your data never leaves your device
- **API Key Encryption**: API keys encrypted and stored securely
- **Optional AI**: All features work with mock data if no API configured

## 📈 Performance

- **Build Size**: ~107KB (minified and bundled)
- **Memory Usage**: Minimal (~20-30MB)
- **Load Time**: < 1 second
- **Response Time**: < 2 seconds (with AI API)

## 🐛 Troubleshooting

### Plugin Not Loading

1. Check Obsidian version (requires 0.15.0+)
2. Verify plugin is enabled in Settings
3. Reload Obsidian (Ctrl+R or Cmd+R)

### AI Connection Failed

1. Verify API key is correct
2. Check internet connection
3. Ensure API key has sufficient credits
4. Test connection in Settings

### Slow Performance

1. Clear Obsidian cache
2. Disable other plugins temporarily
3. Check system resources
4. Update to latest version

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Submit a pull request

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Obsidian team for the excellent plugin API
- AI providers (OpenAI, Anthropic, Google, xAI, Zhipu)
- Community feedback and suggestions

## 📧 Support

For issues, feature requests, or questions:

- GitHub Issues: https://github.com/infolearn-pro/issues
- Email: support@infolearn-pro.com
- Discord: https://discord.gg/infolearn-pro

## 🗺️ Roadmap

- [ ] Real-time collaboration
- [ ] Custom AI model support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (iOS/Android)
- [ ] Browser extension
- [ ] API for third-party integrations
- [ ] Offline mode with local LLM
- [ ] Multi-language support

---

**InfoLearn Pro** - Making learning from infographics smarter and more effective! 🚀
