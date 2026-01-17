/**
 * Star InfoLearn - Main Plugin File (Simplified)
 * Note-based flashcard learning with FSRS spaced repetition
 *
 * Features:
 * - FSRS Spaced Repetition Learning
 * - AI-Powered Card Generation from Notes
 * - 4 Card Types: Flashcard, MCQ, Fill Blank, Short Answer
 */

import { Plugin, PluginSettingTab, App, Setting, Notice, TFile } from 'obsidian';
import { AIService } from './src/services/AIService';
import { DataService } from './src/services/DataService';
import { FSRSService } from './src/services/FSRSService';
import { QuestionGeneratorService } from './src/services/QuestionGeneratorService';
import { useAppStore, AppMode } from './src/store/appStore';
import { AIProvider, AIProviderConfig } from './src/types/ai';
import { LearningCardType } from './src/types/learning';
import { InfoLearnView, INFOLEARN_VIEW_TYPE } from './src/ui/InfoLearnView';

import './src/styles/main.css';

/**
 * Generation settings for AI card creation
 */
export interface GenerationSettings {
  /** Default card types to generate */
  defaultCardTypes: LearningCardType[];
  /** Default number of cards per type */
  defaultCountPerType: number;
  /** Skip notes that already have generated cards */
  skipGeneratedNotes: boolean;
  /** Track generation in frontmatter */
  trackInFrontmatter: boolean;
}

interface StarInfoLearnSettings {
  defaultProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
  generation: GenerationSettings;
}

const DEFAULT_SETTINGS: StarInfoLearnSettings = {
  defaultProvider: 'gemini',
  providers: {
    openai: {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4-turbo',
      baseUrl: 'https://api.openai.com/v1',
    },
    anthropic: {
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-3-opus',
      baseUrl: 'https://api.anthropic.com/v1',
    },
    gemini: {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-2.0-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    },
    grok: {
      provider: 'grok',
      apiKey: '',
      model: 'grok-3',
      baseUrl: 'https://api.x.ai/v1',
    },
    zhipu: {
      provider: 'zhipu',
      apiKey: '',
      model: 'glm-4.7',
      baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    },
  },
  generation: {
    defaultCardTypes: ['flashcard', 'multiple_choice'],
    defaultCountPerType: 3,
    skipGeneratedNotes: true,
    trackInFrontmatter: true,
  },
};

export default class StarInfoLearn extends Plugin {
  settings!: StarInfoLearnSettings;

  // Core services
  aiService!: AIService;
  dataService!: DataService;
  fsrsService!: FSRSService;
  questionGeneratorService!: QuestionGeneratorService;

  async onload() {
    console.log('Loading Star InfoLearn plugin...');

    await this.loadSettings();
    this.initializeServices();

    useAppStore.setState({
      currentAIProvider: this.settings.defaultProvider,
      aiProviders: this.settings.providers,
      generationSettings: this.settings.generation,
    });

    // Register view
    this.registerView(
      INFOLEARN_VIEW_TYPE,
      (leaf) => new InfoLearnView(leaf, this)
    );

    // Add ribbon icon
    this.addRibbonIcon('book-open', 'Star InfoLearn', () => {
      this.activateView();
    });

    // Commands
    this.addCommand({
      id: 'open-star-infolearn',
      name: 'Open Star InfoLearn',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'open-study-dashboard',
      name: 'Open Study Dashboard',
      callback: () => this.activateView('study'),
    });

    this.addCommand({
      id: 'start-review-session',
      name: 'Start Review Session',
      callback: async () => {
        const cards = await this.dataService.loadAllLearningCards();
        const dueCards = cards.filter(card =>
          card.fsrsState.nextReview <= Date.now()
        );

        if (dueCards.length === 0) {
          new Notice('No cards due for review!');
          return;
        }

        useAppStore.setState({
          learningCards: cards,
          reviewState: {
            ...useAppStore.getState().reviewState,
            queue: dueCards.map(c => c.id),
            currentIndex: 0,
            isActive: true,
          },
        });
        this.activateView('review');
      },
    });

    this.addCommand({
      id: 'create-flashcards',
      name: 'Create Flashcards',
      callback: () => this.activateView('card-editor'),
    });

    this.addCommand({
      id: 'generate-cards-from-selection',
      name: 'Generate Flashcards from Selection',
      editorCallback: async (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          const activeFile = this.app.workspace.getActiveFile();
          useAppStore.setState({ selectedText: selection });
          this.activateView('card-editor');
        } else {
          new Notice('Please select some text first');
        }
      },
    });

    this.addCommand({
      id: 'test-ai-connection',
      name: 'Test AI Connection',
      callback: () => this.testAIConnection(),
    });

    // Add settings tab
    this.addSettingTab(new StarInfoLearnSettingTab(this.app, this));

    // Register context menu for editor
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle('Generate Flashcards')
              .setIcon('layers')
              .onClick(async () => {
                useAppStore.setState({ selectedText: selection });
                this.activateView('card-editor');
              });
          });

          menu.addItem((item) => {
            item
              .setTitle('Quick Generate with AI')
              .setIcon('sparkles')
              .onClick(async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!this.settings.providers[this.settings.defaultProvider]?.apiKey) {
                  new Notice('Please configure an AI provider first');
                  this.activateView('settings');
                  return;
                }

                new Notice('Generating flashcards...');
                try {
                  const result = await this.questionGeneratorService.generateMixedQuestions(
                    selection,
                    activeFile?.path || 'unknown',
                    5
                  );
                  if (result.cards.length > 0) {
                    for (const card of result.cards) {
                      await this.dataService.saveLearningCard(card);
                      useAppStore.getState().addCard(card);
                    }
                    new Notice(`Generated ${result.cards.length} flashcards!`);
                  } else {
                    new Notice('No cards could be generated');
                  }
                } catch (error) {
                  new Notice(`Error: ${error}`);
                }
              });
          });
        }
      })
    );

    // Initialize data service and load existing cards
    await this.dataService.initialize();
    await this.loadCardsIntoStore();

    console.log('Star InfoLearn plugin loaded successfully!');
  }

  private initializeServices() {
    this.aiService = new AIService({
      defaultProvider: this.settings.defaultProvider,
      providers: this.settings.providers,
    });

    this.dataService = new DataService(this.app);
    this.fsrsService = new FSRSService();
    this.questionGeneratorService = new QuestionGeneratorService(this.aiService);
  }

  private async loadCardsIntoStore() {
    try {
      const cards = await this.dataService.loadAllLearningCards();
      console.log(`Star InfoLearn: Loaded ${cards.length} cards from storage`);
      useAppStore.setState({ learningCards: cards });

      // Refresh view if open
      const leaves = this.app.workspace.getLeavesOfType(INFOLEARN_VIEW_TYPE);
      leaves.forEach(leaf => {
        const view = leaf.view as InfoLearnView;
        if (view && view.refresh) {
          view.refresh();
        }
      });
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  }

  onunload() {
    console.log('Unloading Star InfoLearn plugin...');
    this.app.workspace.detachLeavesOfType(INFOLEARN_VIEW_TYPE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeServices();
    useAppStore.setState({
      currentAIProvider: this.settings.defaultProvider,
      aiProviders: this.settings.providers,
      generationSettings: this.settings.generation,
    });
  }

  async activateView(mode?: AppMode, text?: string) {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(INFOLEARN_VIEW_TYPE)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({
          type: INFOLEARN_VIEW_TYPE,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);

      if (mode) {
        useAppStore.setState({ currentMode: mode });
      }
      if (text) {
        useAppStore.setState({ selectedText: text });
      }

      const view = leaf.view as InfoLearnView;
      if (view && view.refresh) {
        view.refresh();
      }
    }
  }

  async updateProviderConfig(provider: AIProvider, config: Partial<AIProviderConfig>) {
    this.settings.providers[provider] = {
      ...this.settings.providers[provider],
      ...config,
    };
    await this.saveSettings();
  }

  async setDefaultProvider(provider: AIProvider) {
    this.settings.defaultProvider = provider;
    await this.saveSettings();
    new Notice(`Default provider set to ${provider}`);
  }

  private async testAIConnection() {
    const provider = this.settings.defaultProvider;

    if (!this.settings.providers[provider]?.apiKey) {
      new Notice(`No API key set for ${provider}. Please configure in settings.`);
      return;
    }

    useAppStore.setState({ isLoading: true });
    new Notice(`Testing ${provider} connection...`);

    try {
      const isConnected = await this.aiService.testConnection(provider);
      if (isConnected) {
        new Notice(`${provider} connection successful!`);
      } else {
        new Notice(`${provider} connection failed. Check your API key.`);
      }
    } catch (error) {
      new Notice(`Error: ${error}`);
    } finally {
      useAppStore.setState({ isLoading: false });
    }
  }
}

class StarInfoLearnSettingTab extends PluginSettingTab {
  plugin: StarInfoLearn;

  constructor(app: App, plugin: StarInfoLearn) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Star InfoLearn Settings' });

    // Default Provider Setting
    new Setting(containerEl)
      .setName('Default AI Provider')
      .setDesc('Choose which AI provider to use by default')
      .addDropdown((dropdown) => {
        const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'];
        providers.forEach((provider) => {
          dropdown.addOption(provider, provider.charAt(0).toUpperCase() + provider.slice(1));
        });
        dropdown
          .setValue(this.plugin.settings.defaultProvider)
          .onChange(async (value) => {
            await this.plugin.setDefaultProvider(value as AIProvider);
          });
      });

    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: 'AI Provider Configuration' });

    const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'];
    const providerLabels: Record<AIProvider, string> = {
      openai: 'OpenAI (GPT-4)',
      anthropic: 'Anthropic (Claude)',
      gemini: 'Google Gemini',
      grok: 'xAI Grok',
      zhipu: 'Zhipu GLM',
    };

    providers.forEach((provider) => {
      const config = this.plugin.settings.providers[provider];
      const isDefault = this.plugin.settings.defaultProvider === provider;

      containerEl.createEl('h4', {
        text: `${providerLabels[provider]}${isDefault ? ' (Default)' : ''}`,
      });

      new Setting(containerEl)
        .setName('API Key')
        .setDesc(`Enter your ${provider} API key`)
        .addText((text) => {
          text
            .setPlaceholder(`Enter ${provider} API key`)
            .setValue(config.apiKey || '')
            .onChange(async (value) => {
              await this.plugin.updateProviderConfig(provider, { apiKey: value });
            });
          text.inputEl.type = 'password';
        });

      new Setting(containerEl)
        .setName('Model')
        .setDesc(`Specify the model to use`)
        .addText((text) => {
          text
            .setPlaceholder(`e.g., ${config.model}`)
            .setValue(config.model || '')
            .onChange(async (value) => {
              await this.plugin.updateProviderConfig(provider, { model: value });
            });
        });

      new Setting(containerEl)
        .addButton((button) => {
          button
            .setButtonText('Test Connection')
            .onClick(async () => {
              if (!config.apiKey) {
                new Notice(`Please enter API key for ${provider} first`);
                return;
              }
              button.setDisabled(true);
              button.setButtonText('Testing...');
              try {
                const isConnected = await this.plugin.aiService.testConnection(provider);
                new Notice(isConnected ? `${provider} connected!` : `${provider} failed`);
                button.setButtonText(isConnected ? 'Connected' : 'Failed');
              } catch (e) {
                new Notice(`Error: ${e}`);
                button.setButtonText('Error');
              }
              button.setDisabled(false);
              setTimeout(() => button.setButtonText('Test Connection'), 3000);
            });
        });

      containerEl.createEl('hr');
    });

    containerEl.createEl('p', { text: 'API keys are stored locally and never sent externally.' });

    // Generation Settings Section
    containerEl.createEl('h3', { text: 'Card Generation Settings' });

    // Default card types
    new Setting(containerEl)
      .setName('Default Card Types')
      .setDesc('Card types selected by default when generating');

    const cardTypeContainer = containerEl.createDiv({ cls: 'sil-settings-card-types' });
    const cardTypes: { value: 'flashcard' | 'fill_blank' | 'multiple_choice' | 'short_answer'; label: string }[] = [
      { value: 'flashcard', label: 'Flashcard' },
      { value: 'multiple_choice', label: 'Multiple Choice' },
      { value: 'fill_blank', label: 'Fill Blank' },
      { value: 'short_answer', label: 'Short Answer' },
    ];

    cardTypes.forEach(type => {
      const label = cardTypeContainer.createEl('label', { cls: 'sil-checkbox-label' });
      const checkbox = label.createEl('input', { attr: { type: 'checkbox' } });
      checkbox.checked = this.plugin.settings.generation.defaultCardTypes.includes(type.value);
      checkbox.onchange = async () => {
        const types = this.plugin.settings.generation.defaultCardTypes;
        if (checkbox.checked) {
          if (!types.includes(type.value)) {
            types.push(type.value);
          }
        } else {
          const idx = types.indexOf(type.value);
          if (idx > -1) types.splice(idx, 1);
        }
        await this.plugin.saveSettings();
      };
      label.createSpan({ text: ` ${type.label}` });
    });

    // Default count per type
    new Setting(containerEl)
      .setName('Default Cards Per Type')
      .setDesc('Number of cards to generate per selected type')
      .addDropdown((dropdown) => {
        [1, 2, 3, 4, 5, 7, 10].forEach(num => {
          dropdown.addOption(num.toString(), num.toString());
        });
        dropdown
          .setValue(this.plugin.settings.generation.defaultCountPerType.toString())
          .onChange(async (value) => {
            this.plugin.settings.generation.defaultCountPerType = parseInt(value);
            await this.plugin.saveSettings();
          });
      });

    // Skip generated notes
    new Setting(containerEl)
      .setName('Skip Generated Notes')
      .setDesc('Skip notes that already have cards in batch generation')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.generation.skipGeneratedNotes)
          .onChange(async (value) => {
            this.plugin.settings.generation.skipGeneratedNotes = value;
            await this.plugin.saveSettings();
          });
      });

    // Track in frontmatter
    new Setting(containerEl)
      .setName('Track in Frontmatter')
      .setDesc('Add sil-cards-generated property to notes after generating cards')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.generation.trackInFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.generation.trackInFrontmatter = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
