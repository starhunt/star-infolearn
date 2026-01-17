# InfoLearn Pro - Development Guide

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Development Setup](#development-setup)
4. [Building & Testing](#building--testing)
5. [Code Structure](#code-structure)
6. [API Integration](#api-integration)
7. [Contributing](#contributing)

## Project Overview

InfoLearn Pro is an Obsidian plugin that enhances learning from infographics through three core features:

- **Blanking**: Interactive fill-in-the-blank exercises
- **Rewriting**: Multi-style content rewriting
- **Association**: Knowledge graph creation

The plugin supports multiple AI providers and uses Mock data for development.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────┐
│           Obsidian Plugin Layer             │
│  (main.ts - InfoLearnPro Plugin Class)      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         UI Layer (React Components)         │
│  MainContainer, BlankingView, etc.          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         Service Layer                       │
│  AIService, DataService, BlankingService... │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      State Management (Zustand)             │
│         appStore.ts                         │
└─────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | Responsibility |
|--------|-----------------|
| `AIService` | Handle multi-AI provider communication |
| `DataService` | Manage local data persistence |
| `BlankingService` | Implement blanking feature logic |
| `RewritingService` | Implement rewriting feature logic |
| `AssociationService` | Implement association feature logic |
| `TextExtractorService` | Extract text from PDFs/images |
| `appStore` | Global state management |

## Development Setup

### Prerequisites

```bash
# Check versions
node --version  # v16+
npm --version   # v8+
```

### Installation

```bash
# Clone repository
git clone https://github.com/infolearn-pro/infolearn-pro.git
cd infolearn-pro

# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev
```

### Project Structure

```
infolearn-pro/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── services/        # Business logic services
│   ├── ui/              # React components & Obsidian views
│   ├── store/           # Zustand state management
│   └── styles/          # CSS stylesheets
├── main.ts              # Plugin entry point
├── manifest.json        # Plugin metadata
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── esbuild.config.mjs   # Build configuration
├── README.md            # User documentation
└── DEVELOPMENT.md       # This file
```

## Building & Testing

### Build Commands

```bash
# Production build
npm run build

# Development mode (watch for changes)
npm run dev

# Type checking
npx tsc --noEmit
```

### Testing the Plugin

1. **In Obsidian**:
   - Copy `main.js` and `manifest.json` to `.obsidian/plugins/infolearn-pro/`
   - Reload Obsidian
   - Enable plugin in Settings

2. **Manual Testing**:
   - Test each mode (Blanking, Rewriting, Association)
   - Test AI provider configuration
   - Test data persistence
   - Test error handling

## Code Structure

### Types (`src/types/`)

```typescript
// ai.ts - Core AI types
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'zhipu';

// blanking.ts - Blanking feature types
export interface BlankingData { ... }

// rewriting.ts - Rewriting feature types
export interface RewritingState { ... }

// association.ts - Association feature types
export interface AssociationLink { ... }
```

### Services (`src/services/`)

#### AIService

```typescript
class AIService {
  // Initialize with provider configs
  constructor(config: AIServiceConfig)
  
  // Set active provider
  setProvider(provider: AIProvider): void
  
  // Test connection
  testConnection(provider: AIProvider): Promise<boolean>
  
  // Identify keywords for blanking
  identifyKeywords(text: string, bounds: any[]): Promise<KeywordIdentificationResult[]>
  
  // Rewrite content
  rewriteContent(text: string, options: RewritingOptions): Promise<string>
}
```

#### DataService

```typescript
class DataService {
  // Initialize data directory
  initialize(): Promise<void>
  
  // Save/load blanking data
  saveBlankingData(fileId: string, data: BlankingData): Promise<void>
  loadBlankingData(fileId: string): Promise<BlankingData | null>
  
  // Save/load association links
  saveAssociationLinks(fileId: string, links: AssociationLink[]): Promise<void>
  loadAssociationLinks(fileId: string): Promise<AssociationLink[]>
}
```

#### BlankingService

```typescript
class BlankingService {
  // Identify keywords from text
  identifyKeywords(text: string): Promise<KeywordIdentificationResult[]>
  
  // Check answer
  checkAnswer(blank: KeywordIdentificationResult, userAnswer: string): Promise<boolean>
  
  // Calculate results
  calculateResults(blanks: KeywordIdentificationResult[], answers: Record<string, string>): BlankingResult
}
```

### UI Components (`src/ui/`)

#### BlankingView

```typescript
interface BlankingViewProps {
  text: string;
  onIdentifyKeywords: (text: string) => Promise<any[]>;
}

// Features:
// - Display blanks with visual overlay
// - Input fields for answers
// - Real-time validation
// - Progress tracking
```

#### RewritingView

```typescript
interface RewritingViewProps {
  originalText: string;
  onRewrite: (style: RewritingStyle) => Promise<string>;
}

// Features:
// - Style selection buttons
// - Side-by-side comparison
// - Readability scoring
// - Copy functionality
```

#### AssociationView

```typescript
interface AssociationViewProps {
  links: AssociationLinkItem[];
  onCreateLink: (link: Partial<AssociationLinkItem>) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

// Features:
// - Create new links
// - Manage relationships
// - Visualize graph
// - Statistics display
```

### State Management (`src/store/appStore.ts`)

```typescript
// Global app state
interface AppState {
  currentMode: 'blanking' | 'rewriting' | 'association' | null;
  currentFile: File | null;
  isLoading: boolean;
  currentAIProvider: AIProvider;
  aiProviders: Record<AIProvider, AIProviderConfig>;
  blankingData: BlankingData | null;
  associationLinks: AssociationLink[];
  // ... actions
}

// Usage:
const state = useAppStore();
useAppStore.setState({ currentMode: 'blanking' });
```

## API Integration

### Adding a New AI Provider

1. **Update types** (`src/types/ai.ts`):
```typescript
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'zhipu' | 'newprovider';
```

2. **Update AIService** (`src/services/AIService.ts`):
```typescript
private async mockCallAI(prompt: string, provider: AIProvider, config: AIProviderConfig): Promise<AIResponse> {
  if (provider === 'newprovider') {
    // Implement provider-specific logic
  }
}
```

3. **Update settings** (`main.ts`):
```typescript
const DEFAULT_SETTINGS: InfoLearnSettings = {
  providers: {
    newprovider: { provider: 'newprovider', apiKey: '', model: 'default-model' },
    // ...
  },
};
```

### Implementing Real API Calls

Replace mock implementations in `AIService.mockCallAI()`:

```typescript
private async callRealAPI(prompt: string, provider: AIProvider, config: AIProviderConfig): Promise<string> {
  const response = await axios.post(
    `https://api.${provider}.com/v1/chat/completions`,
    { prompt, model: config.model },
    { headers: { Authorization: `Bearer ${config.apiKey}` } }
  );
  return response.data.choices[0].text;
}
```

## Contributing

### Code Style

- Use TypeScript for type safety
- Follow Obsidian plugin conventions
- Use Zustand for state management
- Keep components small and focused

### Commit Messages

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
refactor: Refactor code
test: Add tests
```

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

### Testing Checklist

- [ ] Code compiles without errors
- [ ] TypeScript type checking passes
- [ ] All features work as expected
- [ ] UI is responsive
- [ ] Error handling is implemented
- [ ] Documentation is updated

## Performance Optimization

### Bundle Size

Current: ~107KB (minified)

Optimization strategies:
- Tree-shake unused code
- Lazy load components
- Minimize dependencies

### Runtime Performance

- Use memoization for expensive computations
- Debounce frequent updates
- Lazy load AI responses
- Cache results locally

## Debugging

### Enable Debug Mode

```typescript
// In main.ts
const DEBUG = true;

if (DEBUG) {
  console.log('InfoLearn Pro Debug Mode');
  console.log('State:', useAppStore.getState());
}
```

### Browser DevTools

```javascript
// In Obsidian console
const store = window.useAppStore;
store.getState(); // View current state
store.setState({ ... }); // Update state
```

## Resources

- [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Create+your+first+plugin)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [esbuild Docs](https://esbuild.github.io/)

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Type Errors

```bash
# Check TypeScript
npx tsc --noEmit

# Fix issues
npm run build
```

### Plugin Not Loading

1. Check `manifest.json` is valid
2. Verify `main.js` exists
3. Check Obsidian console for errors
4. Reload Obsidian

---

**Happy coding!** 🚀
