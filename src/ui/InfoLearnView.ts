/**
 * InfoLearn View - Obsidian Plugin View
 */

import { ItemView, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { AIService } from '../services/AIService';
import { DataService } from '../services/DataService';
import { BlankingService } from '../services/BlankingService';
import { RewritingService } from '../services/RewritingService';
import { AssociationService } from '../services/AssociationService';
import { useAppStore } from '../store/appStore';

export const INFOLEARN_VIEW_TYPE = 'infolearn-view';

export class InfoLearnView extends ItemView {
  private aiService: AIService;
  private dataService: DataService;
  private blankingService: BlankingService;
  private rewritingService: RewritingService;
  private associationService: AssociationService;

  constructor(
    leaf: WorkspaceLeaf,
    aiService: AIService,
    dataService: DataService
  ) {
    super(leaf);
    this.aiService = aiService;
    this.dataService = dataService;
    const textExtractorService = new (require('../services/TextExtractorService').TextExtractorService)();
    this.blankingService = new BlankingService(aiService, textExtractorService);
    this.rewritingService = new RewritingService(aiService);
    this.associationService = new AssociationService(aiService, dataService);
  }

  getViewType(): string {
    return INFOLEARN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Star InfoLearn';
  }

  getIcon(): string {
    return 'book-open';
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('infolearn-view-container');

    // Create main container
    const mainDiv = this.contentEl.createDiv('main-container');

    // Create header
    const header = mainDiv.createDiv('main-header');
    const headerLeft = header.createDiv('header-left');
    headerLeft.createEl('h1', { text: '📚 Star InfoLearn', cls: 'app-title' });
    headerLeft.createEl('p', { text: 'Advanced Infographic Learning Tool', cls: 'app-subtitle' });

    // Create mode selector
    const modeSelector = mainDiv.createDiv('mode-selector');
    this.createModeButtons(modeSelector);

    // Create content area
    const contentArea = mainDiv.createDiv('content-area');
    contentArea.addClass('welcome-screen');
    this.createWelcomeScreen(contentArea);

    // Create footer
    const footer = mainDiv.createDiv('main-footer');
    this.createFooter(footer);
  }

  private createModeButtons(container: HTMLElement): void {
    const modes = [
      { id: 'blanking', icon: '📝', name: 'Blanking', title: 'Fill-in-the-blank learning' },
      { id: 'rewriting', icon: '✏️', name: 'Rewriting', title: 'Rewrite content in different styles' },
      { id: 'association', icon: '🔗', name: 'Association', title: 'Create knowledge connections' },
      { id: 'settings', icon: '⚙️', name: 'Settings', title: 'Configure AI providers' },
    ];

    modes.forEach(mode => {
      const btn = container.createEl('button', {
        cls: 'mode-btn',
        text: `${mode.icon} ${mode.name}`,
      });
      btn.title = mode.title;
      btn.onclick = () => {
        useAppStore.setState({ currentMode: mode.id as any });
        this.updateView();
      };
    });
  }

  private createWelcomeScreen(container: HTMLElement): void {
    container.empty();
    const content = container.createDiv('welcome-content');

    content.createEl('h2', { text: 'Welcome to Star InfoLearn' });
    content.createEl('p', { text: 'Choose a mode to get started:' });

    const grid = content.createDiv('feature-grid');

    const features = [
      {
        icon: '📝',
        title: 'Blanking',
        description: 'Interactive fill-in-the-blank exercises with AI-powered keyword identification',
      },
      {
        icon: '✏️',
        title: 'Rewriting',
        description: 'Rewrite content in 6 different styles: Summary, Detailed, Beginner, Expert, Story, Report',
      },
      {
        icon: '🔗',
        title: 'Association',
        description: 'Build knowledge graphs by creating meaningful connections between concepts',
      },
      {
        icon: '⚙️',
        title: 'Settings',
        description: 'Configure multiple AI providers: OpenAI, Anthropic, Gemini, Grok, Zhipu GLM',
      },
    ];

    features.forEach(feature => {
      const card = grid.createDiv('feature-card');
      card.createEl('div', { text: feature.icon, cls: 'feature-icon' });
      card.createEl('h3', { text: feature.title });
      card.createEl('p', { text: feature.description });
    });
  }

  private createFooter(container: HTMLElement): void {
    const stats = container.createDiv('footer-stats');

    const appStore = useAppStore.getState();
    const providerStat = stats.createDiv('stat');
    providerStat.createSpan({ text: `AI Provider: ${appStore.currentAIProvider}` });

    const statusStat = stats.createDiv('stat');
    statusStat.createSpan({
      text: appStore.isLoading ? '⏳ Processing...' : '✓ Ready',
    });
  }

  private updateView(): void {
    // This would be called when mode changes
    this.onOpen();
  }

  async onClose(): Promise<void> {
    // Clean up
  }
}
