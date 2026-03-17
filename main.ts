/**
 * Star InfoLearn - Main Plugin File (v2)
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
import {
  AIProviderDefinition,
  AIModelDefinition,
  AIServiceConfig,
  BUILT_IN_PROVIDERS,
  BUILT_IN_MODELS,
} from './src/types/ai';
import { LearningCardType } from './src/types/learning';
import { InfoLearnView, INFOLEARN_VIEW_TYPE } from './src/ui/InfoLearnView';
import { AddProviderModal } from './src/ui/modals/AddProviderModal';
import { AddModelModal } from './src/ui/modals/AddModelModal';
import { t, setLocale, setDetectedLocale, SupportedLocale } from './src/i18n';

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

/**
 * v2 설정 구조 (동적 제공자/모델)
 */
interface StarInfoLearnSettings {
  /** 설정 버전 (마이그레이션용) */
  settingsVersion: number;
  /** 등록된 제공자 목록 */
  providers: AIProviderDefinition[];
  /** 등록된 모델 목록 */
  models: AIModelDefinition[];
  /** 기본 제공자 ID */
  defaultProviderId: string;
  /** 기본 모델 ID */
  defaultModelId: string;
  /** 용도별 AI 슬롯 */
  slots: Record<string, { providerId: string; modelId: string }>;
  /** 카드 생성 설정 */
  generation: GenerationSettings;
  /** 인터페이스 언어 */
  language: SupportedLocale;
}

/** 지원하는 AI 슬롯 정의 (t() 기반 동적 반환) */
function getAISlotDefinitions(): { key: string; label: string; desc: string }[] {
  return [
    { key: 'image', label: t().settings.imageGeneration, desc: t().settings.imageGenerationDesc },
  ];
}

const DEFAULT_SETTINGS: StarInfoLearnSettings = {
  settingsVersion: 2,
  providers: [...BUILT_IN_PROVIDERS],
  models: [...BUILT_IN_MODELS],
  defaultProviderId: 'gemini',
  defaultModelId: 'gemini-2.0-flash',
  slots: {},
  generation: {
    defaultCardTypes: ['flashcard', 'multiple_choice'],
    defaultCountPerType: 3,
    skipGeneratedNotes: true,
    trackInFrontmatter: true,
  },
  language: 'auto',
};

/**
 * v1 설정 구조 (마이그레이션용)
 */
interface V1Settings {
  defaultProvider?: string;
  providers?: Record<string, {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
  }>;
  generation?: GenerationSettings;
}

/**
 * v1 → v2 마이그레이션
 */
function migrateV1ToV2(v1: V1Settings): StarInfoLearnSettings {
  const providers: AIProviderDefinition[] = [...BUILT_IN_PROVIDERS];
  const models: AIModelDefinition[] = [...BUILT_IN_MODELS];

  // v1 제공자 매핑
  const v1ToV2Map: Record<string, string> = {
    'openai': 'openai',
    'gemini': 'gemini',
    'zhipu': 'z.ai',
  };

  // 커스텀으로 전환할 v1 제공자
  const customProviders: Record<string, { name: string; baseUrl: string; authType: 'bearer' | 'x-api-key'; apiFormat: 'openai' | 'anthropic' }> = {
    'anthropic': {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      authType: 'x-api-key',
      apiFormat: 'anthropic',
    },
    'grok': {
      name: 'xAI Grok',
      baseUrl: 'https://api.x.ai/v1',
      authType: 'bearer',
      apiFormat: 'openai',
    },
  };

  if (v1.providers) {
    for (const [key, config] of Object.entries(v1.providers)) {
      if (!config.apiKey) continue;

      // 프리셋 제공자에 API 키 복사
      if (v1ToV2Map[key]) {
        const v2Id = v1ToV2Map[key];
        const existing = providers.find(p => p.id === v2Id);
        if (existing) {
          existing.apiKey = config.apiKey;
        }
        // 기존 모델이 기본 모델과 다르면 추가
        const defaultModel = models.find(m => m.providerId === v2Id);
        if (defaultModel && defaultModel.id !== config.model && config.model) {
          models.push({
            id: config.model,
            name: config.model,
            providerId: v2Id,
            enabled: true,
          });
        }
      }

      // 커스텀 제공자로 전환
      if (customProviders[key]) {
        const custom = customProviders[key];
        providers.push({
          id: key,
          name: custom.name,
          baseUrl: config.baseUrl || custom.baseUrl,
          apiKey: config.apiKey,
          authType: custom.authType,
          apiFormat: custom.apiFormat,
          isBuiltIn: false,
        });
        if (config.model) {
          models.push({
            id: config.model,
            name: config.model,
            providerId: key,
            enabled: true,
          });
        }
      }
    }
  }

  // 기본 제공자/모델 매핑
  let defaultProviderId = 'gemini';
  let defaultModelId = 'gemini-2.0-flash';

  if (v1.defaultProvider) {
    const mapped = v1ToV2Map[v1.defaultProvider] || v1.defaultProvider;
    if (providers.some(p => p.id === mapped)) {
      defaultProviderId = mapped;
      const providerModels = models.filter(m => m.providerId === mapped);
      if (providerModels.length > 0) {
        defaultModelId = providerModels[0].id;
      }
    }
  }

  return {
    settingsVersion: 2,
    providers,
    models,
    defaultProviderId,
    defaultModelId,
    slots: {},
    generation: v1.generation || DEFAULT_SETTINGS.generation,
    language: 'auto' as SupportedLocale,
  };
}

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

    // 언어 감지: Obsidian locale → moment locale → localStorage → 'en' 순
    const obsidianLocale = (this.app as any).locale
      || window.localStorage.getItem('language')
      || window.moment?.locale()
      || 'en';
    setDetectedLocale(obsidianLocale);
    if (this.settings.language && this.settings.language !== 'auto') {
      setLocale(this.settings.language as SupportedLocale);
    }

    this.initializeServices();

    useAppStore.setState({
      providers: this.settings.providers,
      models: this.settings.models,
      defaultProviderId: this.settings.defaultProviderId,
      defaultModelId: this.settings.defaultModelId,
      slots: this.settings.slots,
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
                const defaultProvider = this.settings.providers.find(
                  p => p.id === this.settings.defaultProviderId
                );
                if (!defaultProvider?.apiKey) {
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
    const aiConfig: AIServiceConfig = {
      providers: this.settings.providers,
      models: this.settings.models,
      defaultProviderId: this.settings.defaultProviderId,
      defaultModelId: this.settings.defaultModelId,
    };

    this.aiService = new AIService(aiConfig);
    this.dataService = new DataService(this.app);
    this.fsrsService = new FSRSService();
    this.questionGeneratorService = new QuestionGeneratorService(this.aiService);
  }

  private async loadCardsIntoStore() {
    try {
      const cards = await this.dataService.loadAllLearningCards();
      console.log(`Star InfoLearn: Loaded ${cards.length} cards from storage`);
      useAppStore.setState({ learningCards: cards });

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
    const rawData = await this.loadData();

    if (rawData && !rawData.settingsVersion) {
      // v1 형식 → v2 마이그레이션
      console.log('Star InfoLearn: Migrating settings from v1 to v2...');
      this.settings = migrateV1ToV2(rawData as V1Settings);
      await this.saveSettings();
      console.log('Star InfoLearn: Settings migration complete.');
    } else {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, rawData);
      // 프리셋 제공자가 누락되었으면 복원
      for (const builtIn of BUILT_IN_PROVIDERS) {
        if (!this.settings.providers.some(p => p.id === builtIn.id)) {
          this.settings.providers.push({ ...builtIn });
        }
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeServices();
    useAppStore.setState({
      providers: this.settings.providers,
      models: this.settings.models,
      defaultProviderId: this.settings.defaultProviderId,
      defaultModelId: this.settings.defaultModelId,
      slots: this.settings.slots,
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

  /** 제공자 추가/업데이트 */
  async upsertProvider(provider: AIProviderDefinition) {
    const idx = this.settings.providers.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      this.settings.providers[idx] = provider;
    } else {
      this.settings.providers.push(provider);
    }
    await this.saveSettings();
  }

  /** 제공자 삭제 */
  async removeProvider(providerId: string) {
    this.settings.providers = this.settings.providers.filter(p => p.id !== providerId);
    // 해당 제공자의 모델도 삭제
    this.settings.models = this.settings.models.filter(m => m.providerId !== providerId);
    // 기본 제공자가 삭제되었으면 첫 번째 제공자로 변경
    if (this.settings.defaultProviderId === providerId) {
      this.settings.defaultProviderId = this.settings.providers[0]?.id || '';
      const firstModel = this.settings.models.find(m => m.providerId === this.settings.defaultProviderId);
      this.settings.defaultModelId = firstModel?.id || '';
    }
    await this.saveSettings();
  }

  /** 모델 추가/업데이트 */
  async upsertModel(model: AIModelDefinition) {
    const idx = this.settings.models.findIndex(
      m => m.id === model.id && m.providerId === model.providerId
    );
    if (idx >= 0) {
      this.settings.models[idx] = model;
    } else {
      this.settings.models.push(model);
    }
    await this.saveSettings();
  }

  /** 모델 삭제 */
  async removeModel(modelId: string, providerId: string) {
    this.settings.models = this.settings.models.filter(
      m => !(m.id === modelId && m.providerId === providerId)
    );
    // 기본 모델이 삭제되었으면 변경
    if (this.settings.defaultModelId === modelId) {
      const firstModel = this.settings.models.find(m => m.providerId === this.settings.defaultProviderId);
      this.settings.defaultModelId = firstModel?.id || '';
    }
    await this.saveSettings();
  }

  /** 기본 제공자+모델 설정 */
  async setDefault(providerId: string, modelId: string) {
    this.settings.defaultProviderId = providerId;
    this.settings.defaultModelId = modelId;
    await this.saveSettings();
    const provider = this.settings.providers.find(p => p.id === providerId);
    new Notice(t().notice.defaultSet(provider?.name || providerId, modelId));
  }

  private async testAIConnection() {
    const providerId = this.settings.defaultProviderId;
    const provider = this.settings.providers.find(p => p.id === providerId);

    if (!provider?.apiKey) {
      new Notice(`No API key set for ${provider?.name || providerId}. Please configure in settings.`);
      return;
    }

    useAppStore.setState({ isLoading: true });
    new Notice(`Testing ${provider.name} connection...`);

    try {
      const isConnected = await this.aiService.testConnection(providerId, this.settings.defaultModelId);
      if (isConnected) {
        new Notice(`${provider.name} connection successful!`);
      } else {
        new Notice(`${provider.name} connection failed. Check your API key.`);
      }
    } catch (error) {
      new Notice(`Error: ${error}`);
    } finally {
      useAppStore.setState({ isLoading: false });
    }
  }
}

// ============================================================
// 설정 탭
// ============================================================

class StarInfoLearnSettingTab extends PluginSettingTab {
  plugin: StarInfoLearn;

  constructor(app: App, plugin: StarInfoLearn) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('sil-settings-tab');

    containerEl.createEl('h2', { text: t().settings.title });

    // ── 언어 설정 ──
    new Setting(containerEl)
      .setName(t().settings.language)
      .setDesc(t().settings.languageDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('auto', t().settings.languageAuto);
        dropdown.addOption('ko', '한국어');
        dropdown.addOption('en', 'English');
        dropdown.setValue(this.plugin.settings.language);
        dropdown.onChange(async value => {
          this.plugin.settings.language = value as SupportedLocale;
          setLocale(value as SupportedLocale);
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // ── 기본 AI 설정 (한 줄) ──
    this.renderDefaultAISection(containerEl);

    // ── 제공자 관리 ──
    this.renderProvidersSection(containerEl);

    // ── 모델 관리 ──
    this.renderModelsSection(containerEl);

    // ── 카드 생성 설정 ──
    this.renderGenerationSection(containerEl);

    containerEl.createEl('p', {
      text: t().settings.apiKeyLocalOnly,
      cls: 'setting-item-description',
    });
  }

  /** 기본 AI 제공자/모델 선택 — 한 줄에 제공자+모델+테스트 */
  private renderDefaultAISection(containerEl: HTMLElement): void {
    const providerModels = this.plugin.settings.models.filter(
      m => m.providerId === this.plugin.settings.defaultProviderId && m.enabled
    );

    new Setting(containerEl)
      .setName(t().settings.defaultAI)
      .setDesc(t().settings.defaultAIDesc)
      .addDropdown(dropdown => {
        this.plugin.settings.providers.forEach(p => {
          const label = p.apiKey ? p.name : `${p.name} (미설정)`;
          dropdown.addOption(p.id, label);
        });
        dropdown.setValue(this.plugin.settings.defaultProviderId);
        dropdown.onChange(async value => {
          this.plugin.settings.defaultProviderId = value;
          const firstModel = this.plugin.settings.models.find(m => m.providerId === value && m.enabled);
          if (firstModel) {
            this.plugin.settings.defaultModelId = firstModel.id;
          }
          await this.plugin.saveSettings();
          this.display();
        });
      })
      .addDropdown(dropdown => {
        providerModels.forEach(m => {
          dropdown.addOption(m.id, m.name);
        });
        if (providerModels.length === 0) {
          dropdown.addOption('', t().settings.noModels);
        }
        dropdown.setValue(this.plugin.settings.defaultModelId);
        dropdown.onChange(async value => {
          this.plugin.settings.defaultModelId = value;
          await this.plugin.saveSettings();
        });
      })
      .addButton(button => {
        button.setButtonText(t().common.test).setTooltip('연결 테스트').onClick(async () => {
          const provider = this.plugin.settings.providers.find(
            p => p.id === this.plugin.settings.defaultProviderId
          );
          if (!provider?.apiKey) {
            new Notice(t().notice.apiKeyNotSet);
            return;
          }
          button.setDisabled(true);
          button.setButtonText(t().common.testing);
          try {
            const ok = await this.plugin.aiService.testConnection(
              this.plugin.settings.defaultProviderId,
              this.plugin.settings.defaultModelId
            );
            new Notice(ok ? t().notice.connectionSuccess : t().notice.connectionFailed);
            button.setButtonText(ok ? t().common.success : t().common.failure);
          } catch (e) {
            new Notice(t().notice.errorPrefix(String(e)));
            button.setButtonText(t().common.failure);
          }
          button.setDisabled(false);
          setTimeout(() => button.setButtonText(t().common.test), 3000);
        });
      });

    // ── 용도별 AI 슬롯 ──
    for (const slotDef of getAISlotDefinitions()) {
      const slot = this.plugin.settings.slots[slotDef.key];
      const slotProviderId = slot?.providerId || '';
      const slotModels = slotProviderId
        ? this.plugin.settings.models.filter(m => m.providerId === slotProviderId && m.enabled)
        : [];

      new Setting(containerEl)
        .setName(slotDef.label)
        .setDesc(slotDef.desc)
        .addDropdown(dropdown => {
          dropdown.addOption('', t().settings.useDefaultAI);
          this.plugin.settings.providers.forEach(p => {
            const label = p.apiKey ? p.name : `${p.name} (미설정)`;
            dropdown.addOption(p.id, label);
          });
          dropdown.setValue(slotProviderId);
          dropdown.onChange(async value => {
            if (!value) {
              // 슬롯 해제 → 기본 AI 사용
              delete this.plugin.settings.slots[slotDef.key];
            } else {
              const firstModel = this.plugin.settings.models.find(m => m.providerId === value && m.enabled);
              this.plugin.settings.slots[slotDef.key] = {
                providerId: value,
                modelId: firstModel?.id || '',
              };
            }
            await this.plugin.saveSettings();
            this.display();
          });
        })
        .addDropdown(dropdown => {
          if (!slotProviderId) {
            dropdown.addOption('', '—');
            dropdown.setDisabled(true);
          } else {
            slotModels.forEach(m => {
              dropdown.addOption(m.id, m.name);
            });
            if (slotModels.length === 0) {
              dropdown.addOption('', t().settings.noModels);
            }
          }
          dropdown.setValue(slot?.modelId || '');
          dropdown.onChange(async value => {
            if (this.plugin.settings.slots[slotDef.key]) {
              this.plugin.settings.slots[slotDef.key].modelId = value;
              await this.plugin.saveSettings();
            }
          });
        });
    }
  }

  /** 제공자 관리 섹션 */
  private renderProvidersSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t().settings.providers });

    this.plugin.settings.providers.forEach(provider => {
      const isDefault = provider.id === this.plugin.settings.defaultProviderId;
      const statusText = provider.apiKey ? '✓' : '⚠';
      const nameText = `${provider.name}${isDefault ? ` (${t().settings.default})` : ''}`;

      const s = new Setting(containerEl)
        .setName(nameText)
        .setDesc(`${statusText} ${provider.apiKey ? t().settings.apiKeySet : t().settings.apiKeyNotSet}`);

      // 편집
      s.addButton(button => {
        button.setIcon('pencil').setTooltip(t().common.edit).onClick(() => {
          new AddProviderModal(
            this.app,
            async (result) => {
              await this.plugin.upsertProvider(result);
              this.display();
            },
            this.plugin.settings.providers.map(p => p.id),
            provider,
          ).open();
        });
      });

      // 삭제 (프리셋 제외)
      if (!provider.isBuiltIn) {
        s.addButton(button => {
          button.setIcon('trash').setTooltip(t().common.delete).setWarning().onClick(async () => {
            await this.plugin.removeProvider(provider.id);
            this.display();
          });
        });
      }
    });

    // 제공자 추가
    new Setting(containerEl)
      .addButton(button => {
        button.setButtonText(t().settings.addProvider).setCta().onClick(() => {
          new AddProviderModal(
            this.app,
            async (result) => {
              await this.plugin.upsertProvider(result);
              this.display();
            },
            this.plugin.settings.providers.map(p => p.id),
          ).open();
        });
      });
  }

  /** 모델 관리 섹션 — Setting 컴포넌트 기반 */
  private renderModelsSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t().settings.models });

    this.plugin.settings.models.forEach(model => {
      const provider = this.plugin.settings.providers.find(p => p.id === model.providerId);
      const isDefault = model.id === this.plugin.settings.defaultModelId
        && model.providerId === this.plugin.settings.defaultProviderId;

      const keyInfo = model.apiKey ? ` · ${t().settings.dedicatedKey}` : '';
      const s = new Setting(containerEl)
        .setName(`${model.name}${isDefault ? ' ★' : ''}`)
        .setDesc(`${provider?.name || model.providerId}${keyInfo}`);

      // 편집
      s.addButton(button => {
        button.setIcon('pencil').setTooltip(t().common.edit).onClick(() => {
          new AddModelModal(
            this.app,
            this.plugin.settings.providers,
            async (result, originalId) => {
              // ID가 변경되었으면 기존 모델 삭제 후 새로 추가
              if (originalId) {
                await this.plugin.removeModel(originalId, result.providerId);
              }
              await this.plugin.upsertModel(result);
              this.display();
            },
            this.plugin.settings.models.map(m => m.id),
            model,
            this.plugin.aiService,
          ).open();
        });
      });

      // 기본으로 설정
      s.addButton(button => {
        button
          .setIcon('star')
          .setTooltip(t().settings.setAsDefault)
          .onClick(async () => {
            await this.plugin.setDefault(model.providerId, model.id);
            this.display();
          });
        if (isDefault) {
          button.buttonEl.addClass('sil-star-active');
        }
      });

      // 삭제
      s.addButton(button => {
        button.setIcon('trash').setTooltip(t().common.delete).setWarning().onClick(async () => {
          await this.plugin.removeModel(model.id, model.providerId);
          this.display();
        });
      });

      // 활성화 토글
      s.addToggle(toggle => {
        toggle.setValue(model.enabled).setTooltip(t().common.enabled).onChange(async value => {
          model.enabled = value;
          await this.plugin.upsertModel(model);
        });
      });
    });

    // 모델 추가
    new Setting(containerEl)
      .addButton(button => {
        button.setButtonText(t().settings.addModel).setCta().onClick(() => {
          new AddModelModal(
            this.app,
            this.plugin.settings.providers,
            async (result) => {
              await this.plugin.upsertModel(result);
              this.display();
            },
            this.plugin.settings.models.map(m => m.id),
            undefined,
            this.plugin.aiService,
          ).open();
        });
      });
  }

  /** 카드 생성 설정 */
  private renderGenerationSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t().settings.cardGeneration });

    // Default card types
    new Setting(containerEl)
      .setName(t().settings.defaultCardTypes)
      .setDesc(t().settings.defaultCardTypesDesc);

    const cardTypeContainer = containerEl.createDiv({ cls: 'sil-settings-card-types' });
    const cardTypes: { value: LearningCardType; label: string }[] = [
      { value: 'flashcard', label: t().cardType.flashcard },
      { value: 'multiple_choice', label: t().cardType.multiple_choice },
      { value: 'fill_blank', label: t().cardType.fill_blank },
      { value: 'short_answer', label: t().cardType.short_answer },
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
      .setName(t().settings.cardsPerType)
      .setDesc(t().settings.cardsPerTypeDesc)
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
      .setName(t().settings.skipGenerated)
      .setDesc(t().settings.skipGeneratedDesc)
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
      .setName(t().settings.trackFrontmatter)
      .setDesc(t().settings.trackFrontmatterDesc)
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
