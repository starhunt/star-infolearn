/**
 * Star InfoLearn - Main Plugin File
 * Advanced Infographic Learning Tool for Obsidian
 */

import { Plugin, PluginSettingTab, App, Setting, Notice, TFile } from 'obsidian';
import { AIService } from './src/services/AIService';
import { DataService } from './src/services/DataService';
import { TextExtractorService } from './src/services/TextExtractorService';
import { BlankingService } from './src/services/BlankingService';
import { RewritingService } from './src/services/RewritingService';
import { AssociationService } from './src/services/AssociationService';
import { useAppStore } from './src/store/appStore';
import { AIProvider, AIProviderConfig } from './src/types/ai';

interface StarInfoLearnSettings {
  defaultProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
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
};

export default class StarInfoLearn extends Plugin {
  settings!: StarInfoLearnSettings;
  aiService!: AIService;
  dataService!: DataService;
  textExtractorService!: TextExtractorService;
  blankingService!: BlankingService;
  rewritingService!: RewritingService;
  associationService!: AssociationService;

  async onload() {
    console.log('Loading Star InfoLearn plugin...');

    // Load settings
    await this.loadSettings();

    // Initialize services
    this.aiService = new AIService({
      defaultProvider: this.settings.defaultProvider,
      providers: this.settings.providers,
    });

    this.dataService = new DataService(this.app);
    await this.dataService.initialize();

    this.textExtractorService = new TextExtractorService();
    this.blankingService = new BlankingService(this.aiService, this.textExtractorService);
    this.rewritingService = new RewritingService(this.aiService);
    this.associationService = new AssociationService(this.aiService, this.dataService);

    // Update global store
    useAppStore.setState({
      currentAIProvider: this.settings.defaultProvider,
      aiProviders: this.settings.providers,
    });

    // Add ribbon icon
    this.addRibbonIcon('book-open', 'Star InfoLearn', (evt: MouseEvent) => {
      new Notice('Star InfoLearn activated! Select a mode to get started.');
      this.openInfoLearnView();
    });

    // Add commands
    this.addCommand({
      id: 'infolearn-blanking',
      name: 'Start Blanking Mode',
      callback: () => {
        useAppStore.setState({ currentMode: 'blanking' });
        new Notice('Blanking mode activated. Select text to begin.');
      },
    });

    this.addCommand({
      id: 'infolearn-rewriting',
      name: 'Start Rewriting Mode',
      callback: () => {
        useAppStore.setState({ currentMode: 'rewriting' });
        new Notice('Rewriting mode activated. Select text to begin.');
      },
    });

    this.addCommand({
      id: 'infolearn-association',
      name: 'Start Association Mode',
      callback: () => {
        useAppStore.setState({ currentMode: 'association' });
        new Notice('Association mode activated. Create knowledge connections.');
      },
    });

    this.addCommand({
      id: 'infolearn-settings',
      name: 'Open Settings',
      callback: () => {
        useAppStore.setState({ currentMode: 'settings' });
        new Notice('Settings panel opened.');
      },
    });

    this.addCommand({
      id: 'infolearn-test-ai',
      name: 'Test AI Connection',
      callback: () => this.testAIConnection(),
    });

    // Add settings tab
    this.addSettingTab(new StarInfoLearnSettingTab(this.app, this));

    console.log('Star InfoLearn plugin loaded successfully!');
  }

  onunload() {
    console.log('Unloading Star InfoLearn plugin...');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update AI service with new settings
    this.aiService = new AIService({
      defaultProvider: this.settings.defaultProvider,
      providers: this.settings.providers,
    });

    // Update global store
    useAppStore.setState({
      currentAIProvider: this.settings.defaultProvider,
      aiProviders: this.settings.providers,
    });
  }

  async updateProviderConfig(provider: AIProvider, config: Partial<AIProviderConfig>) {
    this.settings.providers[provider] = {
      ...this.settings.providers[provider],
      ...config,
    };
    this.aiService.updateProviderConfig(provider, config);
    await this.saveSettings();
  }

  async setDefaultProvider(provider: AIProvider) {
    this.settings.defaultProvider = provider;
    this.aiService.setDefaultProvider(provider);
    await this.saveSettings();
    new Notice(`✓ Default provider set to ${provider}`);
  }

  private openInfoLearnView() {
    // This will be implemented with the UI components
    new Notice('Star InfoLearn view will open here');
  }

  private async testAIConnection() {
    const provider = this.settings.defaultProvider;
    useAppStore.setState({ isLoading: true });

    try {
      const isConnected = await this.aiService.testConnection(provider);
      if (isConnected) {
        new Notice(`✓ ${provider} connection successful!`);
      } else {
        new Notice(`✗ ${provider} connection failed. Please check your API key.`);
      }
    } catch (error) {
      new Notice(`✗ Error testing connection: ${error}`);
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

    containerEl.createEl('h2', { text: '📚 Star InfoLearn Settings' });

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
            this.plugin.settings.defaultProvider = value as AIProvider;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl('hr');

    // AI Provider Configuration Section
    containerEl.createEl('h3', { text: 'AI Provider Configuration' });

    const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'];
    const providerLabels: Record<AIProvider, string> = {
      openai: 'OpenAI (GPT-4 Turbo)',
      anthropic: 'Anthropic (Claude 3)',
      gemini: 'Google Gemini (Gemini 2.0)',
      grok: 'xAI Grok (Grok-3)',
      zhipu: 'Zhipu GLM (GLM-4.7 - 코딩플랜)',
    };

    providers.forEach((provider) => {
      const config = this.plugin.settings.providers[provider];
      const isDefault = this.plugin.settings.defaultProvider === provider;

      containerEl.createEl('h4', {
        text: `${providerLabels[provider]}${isDefault ? ' (DEFAULT)' : ''}`,
      });

      // API Key Setting
      new Setting(containerEl)
        .setName('API Key')
        .setDesc(`Enter your ${provider} API key`)
        .addText((text) => {
          text
            .setPlaceholder(`Enter ${provider} API key`)
            .setValue(config.apiKey || '')
            .onChange(async (value) => {
              this.plugin.settings.providers[provider].apiKey = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.type = 'password';
        });

      // Model Setting
      new Setting(containerEl)
        .setName('Model')
        .setDesc(`Specify the model to use for ${provider}`)
        .addText((text) => {
          text
            .setPlaceholder(`e.g., ${config.model}`)
            .setValue(config.model || '')
            .onChange(async (value) => {
              this.plugin.settings.providers[provider].model = value;
              await this.plugin.saveSettings();
            });
        });

      // Test Connection Button
      new Setting(containerEl)
        .setName('Test Connection')
        .setDesc('Click to test the connection to this provider')
        .addButton((button) => {
          button
            .setButtonText('Test Connection')
            .onClick(async () => {
              button.setDisabled(true);
              button.setButtonText('Testing...');
              try {
                const isConnected = await this.plugin.aiService.testConnection(provider);
                if (isConnected) {
                  new Notice(`✓ ${provider} connection successful!`);
                  button.setButtonText('✓ Connected');
                } else {
                  new Notice(`✗ ${provider} connection failed. Please check your API key.`);
                  button.setButtonText('✗ Failed');
                }
              } catch (error) {
                new Notice(`✗ Error: ${error}`);
                button.setButtonText('✗ Error');
              }
              button.setDisabled(false);
              setTimeout(() => {
                button.setButtonText('Test Connection');
              }, 3000);
            });
        });

      // Set as Default Button
      if (!isDefault) {
        new Setting(containerEl)
          .setName('Set as Default')
          .setDesc(`Make ${provider} your default AI provider`)
          .addButton((button) => {
            button
              .setButtonText('Set as Default')
              .onClick(async () => {
                await this.plugin.setDefaultProvider(provider);
                this.display(); // Refresh display
              });
          });
      }

      containerEl.createEl('hr');
    });

    // Information Section
    containerEl.createEl('h3', { text: 'ℹ️ Information' });

    containerEl.createEl('p', {
      text: '🔒 Your API keys are stored locally in your Obsidian vault and never sent to external servers.',
    });

    containerEl.createEl('p', {
      text: '🌐 Zhipu GLM uses the coding plan endpoint (https://api.z.ai/api/coding/paas/v4) for optimal performance.',
    });

    containerEl.createEl('p', {
      text: '💡 You can configure multiple providers and switch between them at any time.',
    });

    containerEl.createEl('p', {
      text: '🚀 For the best experience, set up at least one AI provider with a valid API key.',
    });
  }
}
