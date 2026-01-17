/**
 * InfoLearn View - Obsidian Plugin View (Simplified)
 * 4 modes: study, review, card-editor, settings
 */

import { ItemView, WorkspaceLeaf, Notice, MarkdownView, TFile, TFolder } from 'obsidian';
import { useAppStore, AppMode, GenerationConfig } from '../store/appStore';
import { LearningCard, LearningCardType, createLearningCard } from '../types/learning';
import { ManualCardModal } from './ManualCardModal';
import { DeleteCardsModal, DeleteCardsModalResult } from './DeleteCardsModal';
import {
  hasGeneratedCards,
  getGenerationDate,
  markAsGenerated,
  getMarkdownFilesInFolder,
  filterFilesByDateRange,
  filterUngenerated,
  getAllFolders,
  NoteInfo,
  getNoteInfo,
} from '../utils/frontmatter';
import type StarInfoLearn from '../../main';

export const INFOLEARN_VIEW_TYPE = 'star-infolearn-view';

export class InfoLearnView extends ItemView {
  private plugin: StarInfoLearn;
  private contentAreaEl!: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private activeLeafHandler: (() => void) | null = null;
  // Store shuffled MCQ options per card to maintain consistency during review
  private shuffledOptionsCache: Map<string, { id: string; text: string; isCorrect: boolean }[]> = new Map();
  // Store shuffled blanks order per card
  private shuffledBlanksCache: Map<string, { originalIndex: number; position: number; answer: string }[]> = new Map();

  constructor(leaf: WorkspaceLeaf, plugin: StarInfoLearn) {
    super(leaf);
    this.plugin = plugin;
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
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('star-infolearn-container');

    this.unsubscribe = useAppStore.subscribe(() => {
      this.refresh();
    });

    // Listen for active file changes to update current note info
    this.activeLeafHandler = () => {
      const state = useAppStore.getState();
      // Only refresh if we're in card-editor mode (where current note info is shown)
      if (state.currentMode === 'card-editor') {
        this.refresh();
      }
    };
    this.app.workspace.on('active-leaf-change', this.activeLeafHandler);

    this.renderView(container as HTMLElement);
  }

  async onClose(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.activeLeafHandler) {
      this.app.workspace.off('active-leaf-change', this.activeLeafHandler);
    }
  }

  public refresh(): void {
    const container = this.containerEl.children[1];
    if (container) {
      container.empty();
      this.renderView(container as HTMLElement);
    }
  }

  // Fisher-Yates shuffle algorithm for randomizing card order
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private renderView(container: HTMLElement): void {
    const state = useAppStore.getState();

    const wrapper = container.createDiv({ cls: 'sil-wrapper' });

    this.renderHeader(wrapper);
    this.renderModeSelector(wrapper);

    this.contentAreaEl = wrapper.createDiv({ cls: 'sil-content' });
    this.renderContent(state.currentMode);

    this.renderFooter(wrapper);
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createDiv({ cls: 'sil-header' });
    header.createEl('h2', { text: 'Star InfoLearn' });

    const state = useAppStore.getState();

    const statsDiv = header.createDiv({ cls: 'sil-header-stats' });
    const dueCount = state.learningCards.filter(c => c.fsrsState.nextReview <= Date.now()).length;
    statsDiv.createSpan({
      text: `${state.learningCards.length}개 카드 | 오늘 ${dueCount}개 복습 예정`,
      cls: 'sil-stats-text'
    });

    if (state.selectedText) {
      const textPreview = header.createDiv({ cls: 'sil-text-preview' });
      textPreview.createSpan({ text: '선택됨: ' });
      textPreview.createSpan({
        text: state.selectedText.slice(0, 50) + (state.selectedText.length > 50 ? '...' : ''),
        cls: 'sil-preview-text'
      });
    }
  }

  private renderModeSelector(container: HTMLElement): void {
    const state = useAppStore.getState();
    const selector = container.createDiv({ cls: 'sil-mode-selector' });

    const modes: { id: AppMode; icon: string; name: string; desc: string }[] = [
      { id: 'study', icon: '📖', name: '학습', desc: '학습 대시보드' },
      { id: 'review', icon: '🔄', name: '복습', desc: '간격 반복 학습' },
      { id: 'card-editor', icon: '✏️', name: '생성', desc: '카드 생성' },
      { id: 'settings', icon: '⚙️', name: '설정', desc: 'AI 제공자' },
    ];

    modes.forEach(mode => {
      const btn = selector.createEl('button', {
        cls: `sil-mode-btn ${state.currentMode === mode.id ? 'active' : ''}`,
      });
      btn.createSpan({ text: mode.icon, cls: 'sil-mode-icon' });
      btn.createSpan({ text: mode.name, cls: 'sil-mode-name' });
      btn.title = mode.desc;
      btn.onclick = () => {
        useAppStore.setState({ currentMode: mode.id });
      };
    });
  }

  private renderContent(mode: AppMode | null): void {
    this.contentAreaEl.empty();

    switch (mode) {
      case 'study':
        this.renderStudyMode();
        break;
      case 'review':
        this.renderReviewMode();
        break;
      case 'card-editor':
        this.renderCardEditorMode();
        break;
      case 'settings':
        this.renderSettingsMode();
        break;
      default:
        this.renderWelcome();
    }
  }

  private renderWelcome(): void {
    const welcome = this.contentAreaEl.createDiv({ cls: 'sil-welcome' });
    welcome.createEl('h3', { text: 'Star InfoLearn에 오신 것을 환영합니다' });
    welcome.createEl('p', { text: 'Obsidian을 위한 AI 기반 플래시카드 학습' });

    const actions = welcome.createDiv({ cls: 'sil-quick-actions' });

    const studyBtn = actions.createEl('button', { cls: 'sil-action-btn primary' });
    studyBtn.createSpan({ text: '학습 시작하기' });
    studyBtn.onclick = () => useAppStore.setState({ currentMode: 'study' });

    const createBtn = actions.createEl('button', { cls: 'sil-action-btn' });
    createBtn.createSpan({ text: '카드 만들기' });
    createBtn.onclick = () => useAppStore.setState({ currentMode: 'card-editor' });

    const features = welcome.createDiv({ cls: 'sil-features' });
    features.createEl('h4', { text: '주요 기능:' });

    const featureList = [
      'FSRS 간격 반복 - 최적의 복습 스케줄링',
      'AI 카드 생성 - 노트에서 자동으로 카드 생성',
      '4가지 퀴즈 유형 - 플래시카드, 객관식, 빈칸, 단답형',
      '진행 추적 - 학습 여정을 추적',
    ];

    const ul = features.createEl('ul', { cls: 'sil-feature-list' });
    featureList.forEach(feature => {
      ul.createEl('li', { text: feature });
    });

    const tip = welcome.createDiv({ cls: 'sil-tip' });
    tip.createSpan({ text: '팁: 노트에서 텍스트를 선택하고 우클릭하여 플래시카드를 생성하세요!' });
  }

  private renderStudyMode(): void {
    const state = useAppStore.getState();
    const content = this.contentAreaEl.createDiv({ cls: 'sil-study' });

    // Header with title and refresh button
    const header = content.createDiv({ cls: 'sil-study-header' });
    header.createEl('h3', { text: '학습 대시보드' });

    const refreshBtn = header.createEl('button', { cls: 'sil-refresh-btn' });
    refreshBtn.innerHTML = '&#x21bb;'; // Refresh icon
    refreshBtn.title = '새로고침';
    refreshBtn.onclick = async () => {
      refreshBtn.addClass('spinning');
      // Reload cards from storage
      const cards = await (this.plugin as any).dataService.loadAllLearningCards();
      useAppStore.setState({ learningCards: cards });
      this.refresh();
    };

    // Stats cards
    const statsGrid = content.createDiv({ cls: 'sil-stats-grid' });

    const totalCards = state.learningCards.length;
    const dueCards = state.learningCards.filter(c => c.fsrsState.nextReview <= Date.now()).length;
    const newCards = state.learningCards.filter(c => c.fsrsState.state === 'new').length;
    const reviewCards = state.learningCards.filter(c => c.fsrsState.state === 'review').length;

    const stats = [
      { label: '전체 카드', value: totalCards, icon: '📋' },
      { label: '오늘 복습', value: dueCards, icon: '🎯', highlight: dueCards > 0 },
      { label: '새 카드', value: newCards, icon: '✨' },
      { label: '복습 중', value: reviewCards, icon: '🔄' },
    ];

    stats.forEach(stat => {
      const card = statsGrid.createDiv({ cls: `sil-stat-card ${stat.highlight ? 'highlight' : ''}` });
      card.createSpan({ text: stat.icon, cls: 'sil-stat-icon' });
      card.createEl('div', { text: stat.value.toString(), cls: 'sil-stat-value' });
      card.createEl('div', { text: stat.label, cls: 'sil-stat-label' });
    });

    // Quick actions
    const actionsSection = content.createDiv({ cls: 'sil-actions-section' });
    actionsSection.createEl('h4', { text: '빠른 실행' });

    const actionGrid = actionsSection.createDiv({ cls: 'sil-action-grid' });

    if (dueCards > 0) {
      const reviewBtn = actionGrid.createEl('button', { cls: 'sil-action-btn primary' });
      reviewBtn.createSpan({ text: `${dueCards}개 카드 복습하기` });
      reviewBtn.onclick = () => {
        const dueCardIds = state.learningCards
          .filter(c => c.fsrsState.nextReview <= Date.now())
          .map(c => c.id);

        this.shuffledOptionsCache.clear(); // Clear MCQ options cache for new session
        this.shuffledBlanksCache.clear(); // Clear fill-blank cache for new session
        useAppStore.setState({
          reviewState: {
            ...state.reviewState,
            queue: this.shuffleArray(dueCardIds), // Randomize order
            currentIndex: 0,
            isActive: true,
          },
          currentMode: 'review',
        });
      };
    } else {
      const noCardsMsg = actionGrid.createDiv({ cls: 'sil-no-due' });
      noCardsMsg.createSpan({ text: '복습할 카드가 없습니다! 카드를 만들어 학습을 시작하세요.' });
    }

    const createBtn = actionGrid.createEl('button', { cls: 'sil-action-btn' });
    createBtn.createSpan({ text: '카드 만들기' });
    createBtn.onclick = () => useAppStore.setState({ currentMode: 'card-editor' });

    // Delete cards button (if there are cards)
    if (state.learningCards.length > 0) {
      const deleteBtn = actionGrid.createEl('button', { cls: 'sil-action-btn danger' });
      deleteBtn.createSpan({ text: '카드 삭제' });
      deleteBtn.onclick = () => {
        const currentFile = this.app.workspace.getActiveFile();
        const modal = new DeleteCardsModal(
          this.app,
          state.learningCards,
          currentFile,
          async (result: DeleteCardsModalResult) => {
            const cardsToDelete = result.cardsToDelete;
            if (cardsToDelete.length === 0) return;

            for (const card of cardsToDelete) {
              await this.plugin.dataService.deleteLearningCard(card.id);
            }

            const remainingCards = state.learningCards.filter(
              c => !cardsToDelete.some(d => d.id === c.id)
            );
            useAppStore.setState({ learningCards: remainingCards });
            new Notice(`${cardsToDelete.length}개의 카드가 삭제되었습니다.`);
            this.refresh();
          }
        );
        modal.open();
      };
    }

    // Recent cards
    if (state.learningCards.length > 0) {
      const recentSection = content.createDiv({ cls: 'sil-recent-section' });
      recentSection.createEl('h4', { text: '최근 카드' });

      const cardList = recentSection.createDiv({ cls: 'sil-card-list' });
      const sortedCards = [...state.learningCards].sort((a, b) => b.updatedAt - a.updatedAt);

      sortedCards.slice(0, 5).forEach(card => {
        const cardItem = cardList.createDiv({ cls: 'sil-card-item' });
        cardItem.createSpan({ text: this.getCardTypeIcon(card.type), cls: 'sil-card-type' });
        cardItem.createSpan({
          text: card.front.slice(0, 50) + (card.front.length > 50 ? '...' : ''),
          cls: 'sil-card-preview'
        });

        const stateSpan = cardItem.createSpan({ cls: `sil-card-state ${card.fsrsState.state}` });
        stateSpan.textContent = card.fsrsState.state;
      });
    }

    // Card type distribution
    if (state.learningCards.length > 0) {
      const distributionSection = content.createDiv({ cls: 'sil-distribution-section' });
      distributionSection.createEl('h4', { text: '카드 유형' });

      const typeCount: Record<string, number> = {};
      state.learningCards.forEach(card => {
        typeCount[card.type] = (typeCount[card.type] || 0) + 1;
      });

      const typeGrid = distributionSection.createDiv({ cls: 'sil-type-grid' });
      Object.entries(typeCount).forEach(([type, count]) => {
        const typeItem = typeGrid.createDiv({ cls: 'sil-type-item' });
        typeItem.createSpan({ text: this.getCardTypeIcon(type), cls: 'sil-type-icon' });
        typeItem.createSpan({ text: `${this.getCardTypeName(type)}: ${count}`, cls: 'sil-type-count' });
      });
    }
  }

  private renderReviewMode(): void {
    const state = useAppStore.getState();
    const content = this.contentAreaEl.createDiv({ cls: 'sil-review' });

    content.createEl('h3', { text: '복습 세션' });

    if (!state.reviewState.isActive || state.reviewState.queue.length === 0) {
      const dueCards = state.learningCards.filter(c => c.fsrsState.nextReview <= Date.now());

      if (dueCards.length === 0) {
        const emptyState = content.createDiv({ cls: 'sil-empty-state' });
        emptyState.createEl('div', { text: '🎉', cls: 'sil-empty-icon' });
        emptyState.createEl('h4', { text: '모두 완료!' });
        emptyState.createEl('p', { text: '복습할 카드가 없습니다. 나중에 다시 확인하세요!' });

        const backBtn = emptyState.createEl('button', { text: '← 대시보드로 돌아가기' });
        backBtn.onclick = () => useAppStore.setState({ currentMode: 'study' });
        return;
      }

      const startSection = content.createDiv({ cls: 'sil-start-section' });
      startSection.createEl('p', { text: `복습할 카드가 ${dueCards.length}개 있습니다.` });

      const startBtn = startSection.createEl('button', { cls: 'sil-primary-btn' });
      startBtn.textContent = `복습 시작 (${dueCards.length}개)`;
      startBtn.onclick = () => {
        this.shuffledOptionsCache.clear(); // Clear MCQ options cache for new session
        this.shuffledBlanksCache.clear(); // Clear fill-blank cache for new session
        useAppStore.setState({
          reviewState: {
            ...state.reviewState,
            queue: this.shuffleArray(dueCards.map(c => c.id)), // Randomize order
            currentIndex: 0,
            isActive: true,
            showAnswer: false,
          },
        });
        this.refresh();
      };
      return;
    }

    // Active review
    const currentCardId = state.reviewState.queue[state.reviewState.currentIndex];
    const currentCard = state.learningCards.find(c => c.id === currentCardId);

    if (!currentCard) {
      content.createEl('p', { text: '카드를 찾을 수 없습니다' });
      return;
    }

    // Progress bar
    const progressSection = content.createDiv({ cls: 'sil-progress-section' });
    const progress = ((state.reviewState.currentIndex + 1) / state.reviewState.queue.length) * 100;
    const progressBar = progressSection.createDiv({ cls: 'sil-progress-bar' });
    progressBar.createDiv({ cls: 'sil-progress-fill' }).style.width = `${progress}%`;
    progressSection.createSpan({
      text: `${state.reviewState.currentIndex + 1} / ${state.reviewState.queue.length}`,
      cls: 'sil-progress-text'
    });

    // Card type indicator
    const cardTypeDiv = content.createDiv({ cls: 'sil-card-type-indicator' });
    cardTypeDiv.createSpan({ text: `${this.getCardTypeIcon(currentCard.type)} ${this.getCardTypeName(currentCard.type)}` });

    // Render card based on type
    switch (currentCard.type) {
      case 'flashcard':
        this.renderFlashcard(content, currentCard, state.reviewState.showAnswer);
        break;
      case 'multiple_choice':
        this.renderMCQ(content, currentCard, state.reviewState);
        break;
      case 'fill_blank':
        this.renderFillBlank(content, currentCard, state.reviewState);
        break;
      case 'short_answer':
        this.renderShortAnswer(content, currentCard, state.reviewState);
        break;
      default:
        this.renderFlashcard(content, currentCard, state.reviewState.showAnswer);
    }
  }

  private renderFlashcard(container: HTMLElement, card: LearningCard, showAnswer: boolean): void {
    const state = useAppStore.getState();
    const cardDisplay = container.createDiv({ cls: 'sil-card-display flashcard' });

    const cardFront = cardDisplay.createDiv({ cls: 'sil-card-front' });
    cardFront.createEl('div', { text: card.front, cls: 'sil-card-content' });

    if (card.hint && !showAnswer) {
      const hintDiv = cardDisplay.createDiv({ cls: 'sil-hint' });
      hintDiv.createSpan({ text: '힌트: ' + card.hint });
    }

    if (showAnswer) {
      const cardBack = cardDisplay.createDiv({ cls: 'sil-card-back' });
      cardBack.createEl('div', { text: card.back, cls: 'sil-card-content' });

      if (card.explanation) {
        const explainDiv = cardDisplay.createDiv({ cls: 'sil-explanation' });
        explainDiv.createSpan({ text: card.explanation });
      }

      this.renderRatingButtons(container, card);
    } else {
      const showBtn = container.createEl('button', { cls: 'sil-show-answer-btn' });
      showBtn.textContent = '정답 보기';
      showBtn.onclick = () => {
        useAppStore.setState({
          reviewState: {
            ...state.reviewState,
            showAnswer: true,
          },
        });
      };
    }
  }

  private renderMCQ(container: HTMLElement, card: LearningCard, reviewState: typeof useAppStore.getState.prototype.reviewState): void {
    const cardDisplay = container.createDiv({ cls: 'sil-card-display mcq' });

    cardDisplay.createEl('div', { text: card.front, cls: 'sil-card-question' });

    if (!card.options || card.options.length === 0) {
      cardDisplay.createEl('p', { text: '선택지가 없습니다', cls: 'sil-error' });
      return;
    }

    // Get or create shuffled options for this card
    let shuffledOptions = this.shuffledOptionsCache.get(card.id);
    if (!shuffledOptions) {
      shuffledOptions = this.shuffleArray([...card.options]);
      this.shuffledOptionsCache.set(card.id, shuffledOptions);
    }

    const optionsDiv = cardDisplay.createDiv({ cls: 'sil-options' });

    shuffledOptions.forEach(option => {
      const optionBtn = optionsDiv.createEl('button', {
        cls: `sil-option ${reviewState.selectedOptionId === option.id ? 'selected' : ''} ${
          reviewState.showAnswer ? (option.isCorrect ? 'correct' : reviewState.selectedOptionId === option.id ? 'incorrect' : '') : ''
        }`,
      });
      optionBtn.createSpan({ text: option.text });

      if (!reviewState.showAnswer) {
        optionBtn.onclick = () => {
          useAppStore.setState({
            reviewState: {
              ...reviewState,
              selectedOptionId: option.id,
            },
          });
        };
      }
    });

    if (reviewState.showAnswer) {
      const isCorrect = card.options.find(o => o.id === reviewState.selectedOptionId)?.isCorrect;
      const resultDiv = cardDisplay.createDiv({ cls: `sil-result ${isCorrect ? 'correct' : 'incorrect'}` });
      resultDiv.createSpan({ text: isCorrect ? '✓ 정답!' : '✗ 오답' });

      if (card.explanation) {
        const explainDiv = cardDisplay.createDiv({ cls: 'sil-explanation' });
        explainDiv.createSpan({ text: card.explanation });
      }

      this.renderRatingButtons(container, card);
    } else {
      const submitBtn = container.createEl('button', {
        cls: `sil-submit-btn ${!reviewState.selectedOptionId ? 'disabled' : ''}`,
      });
      submitBtn.textContent = '답안 제출';
      submitBtn.disabled = !reviewState.selectedOptionId;
      submitBtn.onclick = () => {
        useAppStore.setState({
          reviewState: {
            ...reviewState,
            showAnswer: true,
            isAnswerSubmitted: true,
          },
        });
      };
    }
  }

  private renderFillBlank(container: HTMLElement, card: LearningCard, reviewState: typeof useAppStore.getState.prototype.reviewState): void {
    const cardDisplay = container.createDiv({ cls: 'sil-card-display fill-blank' });

    cardDisplay.createEl('div', { text: '빈칸을 채우세요:', cls: 'sil-card-instruction' });
    cardDisplay.createEl('div', { text: card.front, cls: 'sil-card-question' });

    const inputsDiv = cardDisplay.createDiv({ cls: 'sil-blank-inputs' });

    const originalBlanks = card.blanks || [{ position: 0, answer: card.back }];

    // Get or create shuffled blanks for this card
    let shuffledBlanks = this.shuffledBlanksCache.get(card.id);
    if (!shuffledBlanks) {
      shuffledBlanks = this.shuffleArray(
        originalBlanks.map((blank, idx) => ({ ...blank, originalIndex: idx }))
      );
      this.shuffledBlanksCache.set(card.id, shuffledBlanks);
    }

    shuffledBlanks.forEach((blank, displayIdx) => {
      const originalIdx = blank.originalIndex;
      const inputWrapper = inputsDiv.createDiv({ cls: 'sil-blank-input-wrapper' });
      inputWrapper.createSpan({ text: `빈칸 ${displayIdx + 1}: ` });

      if (reviewState.showAnswer) {
        const userAnswer = reviewState.blankAnswers[originalIdx] || '';
        const isCorrect = userAnswer.toLowerCase().trim() === blank.answer.toLowerCase().trim();

        const answerSpan = inputWrapper.createSpan({
          cls: `sil-blank-answer ${isCorrect ? 'correct' : 'incorrect'}`,
        });
        answerSpan.textContent = userAnswer || '(미입력)';

        if (!isCorrect) {
          inputWrapper.createSpan({ text: ` → ${blank.answer}`, cls: 'sil-correct-answer' });
        }
      } else {
        const input = inputWrapper.createEl('input', {
          cls: 'sil-blank-input',
          attr: { type: 'text', placeholder: '답을 입력하세요...' }
        });
        input.value = reviewState.blankAnswers[originalIdx] || '';
        input.oninput = (e) => {
          const newAnswers = [...reviewState.blankAnswers];
          newAnswers[originalIdx] = (e.target as HTMLInputElement).value;
          useAppStore.setState({
            reviewState: {
              ...reviewState,
              blankAnswers: newAnswers,
            },
          });
        };
      }
    });

    if (reviewState.showAnswer) {
      const allCorrect = originalBlanks.every((blank, idx) => {
        const userAnswer = reviewState.blankAnswers[idx] || '';
        return userAnswer.toLowerCase().trim() === blank.answer.toLowerCase().trim();
      });

      const resultDiv = cardDisplay.createDiv({ cls: `sil-result ${allCorrect ? 'correct' : 'incorrect'}` });
      resultDiv.createSpan({ text: allCorrect ? '✓ 모두 정답!' : '✗ 일부 오답이 있습니다' });

      if (card.explanation) {
        const explainDiv = cardDisplay.createDiv({ cls: 'sil-explanation' });
        explainDiv.createSpan({ text: card.explanation });
      }

      this.renderRatingButtons(container, card);
    } else {
      const submitBtn = container.createEl('button', { cls: 'sil-submit-btn' });
      submitBtn.textContent = '정답 확인';
      submitBtn.onclick = () => {
        useAppStore.setState({
          reviewState: {
            ...reviewState,
            showAnswer: true,
            isAnswerSubmitted: true,
          },
        });
      };
    }
  }

  private renderShortAnswer(container: HTMLElement, card: LearningCard, reviewState: typeof useAppStore.getState.prototype.reviewState): void {
    const cardDisplay = container.createDiv({ cls: 'sil-card-display short-answer' });

    cardDisplay.createEl('div', { text: card.front, cls: 'sil-card-question' });

    if (card.hint && !reviewState.showAnswer) {
      const hintDiv = cardDisplay.createDiv({ cls: 'sil-hint' });
      hintDiv.createSpan({ text: '힌트: ' + card.hint });
    }

    if (reviewState.showAnswer) {
      const userAnswerDiv = cardDisplay.createDiv({ cls: 'sil-user-answer' });
      userAnswerDiv.createSpan({ text: '내 답변: ' });
      userAnswerDiv.createSpan({ text: reviewState.userAnswer || '(미입력)', cls: 'sil-answer-text' });

      const correctDiv = cardDisplay.createDiv({ cls: 'sil-correct-answer-section' });
      correctDiv.createSpan({ text: '정답: ' });
      correctDiv.createSpan({ text: card.back, cls: 'sil-answer-text' });

      if (card.explanation) {
        const explainDiv = cardDisplay.createDiv({ cls: 'sil-explanation' });
        explainDiv.createSpan({ text: card.explanation });
      }

      this.renderRatingButtons(container, card);
    } else {
      const answerArea = cardDisplay.createEl('textarea', {
        cls: 'sil-answer-textarea',
        attr: { placeholder: '답을 입력하세요...', rows: '4' }
      });
      answerArea.value = reviewState.userAnswer;
      answerArea.oninput = (e) => {
        useAppStore.setState({
          reviewState: {
            ...reviewState,
            userAnswer: (e.target as HTMLTextAreaElement).value,
          },
        });
      };

      const submitBtn = container.createEl('button', { cls: 'sil-submit-btn' });
      submitBtn.textContent = '정답 보기';
      submitBtn.onclick = () => {
        useAppStore.setState({
          reviewState: {
            ...reviewState,
            showAnswer: true,
            isAnswerSubmitted: true,
          },
        });
      };
    }
  }

  private renderRatingButtons(container: HTMLElement, card: LearningCard): void {
    const ratingSection = container.createDiv({ cls: 'sil-rating-section' });
    ratingSection.createEl('p', { text: '얼마나 잘 기억하셨나요?' });

    const ratingButtons = ratingSection.createDiv({ cls: 'sil-rating-buttons' });

    const ratings = [
      { rating: 1, label: '다시', desc: '완전히 잊음', cls: 'again' },
      { rating: 2, label: '어려움', desc: '겨우 기억함', cls: 'hard' },
      { rating: 3, label: '보통', desc: '정확히 기억', cls: 'good' },
      { rating: 4, label: '쉬움', desc: '완벽히 기억', cls: 'easy' },
    ];

    ratings.forEach(r => {
      const btn = ratingButtons.createEl('button', { cls: `sil-rating-btn ${r.cls}` });
      btn.createEl('div', { text: r.label, cls: 'sil-rating-label' });
      btn.createEl('div', { text: r.desc, cls: 'sil-rating-desc' });
      btn.onclick = () => this.handleRating(card.id, r.rating as 1 | 2 | 3 | 4);
    });
  }

  private async handleRating(cardId: string, rating: 1 | 2 | 3 | 4): Promise<void> {
    const state = useAppStore.getState();
    const card = state.learningCards.find(c => c.id === cardId);

    if (!card) return;

    const newState = this.plugin.fsrsService.processReview(card.fsrsState, rating);
    const updatedCard = { ...card, fsrsState: newState };
    useAppStore.getState().updateCard(updatedCard);

    await this.plugin.dataService.saveLearningCard(updatedCard);

    const reviewDuration = state.reviewState.cardShowTime
      ? Date.now() - state.reviewState.cardShowTime
      : 0;

    await this.plugin.dataService.saveReviewLog({
      cardId,
      rating,
      timestamp: Date.now(),
      stateBefore: card.fsrsState.state,
      stateAfter: newState.state,
      scheduledDays: newState.scheduledDays,
      elapsedDays: newState.elapsedDays,
      reviewDuration,
    });

    // Move to next card
    const nextIndex = state.reviewState.currentIndex + 1;
    if (nextIndex >= state.reviewState.queue.length) {
      useAppStore.setState({
        reviewState: {
          ...state.reviewState,
          isActive: false,
          currentIndex: 0,
          queue: [],
          showAnswer: false,
          selectedOptionId: null,
          blankAnswers: [],
          userAnswer: '',
        },
      });
      new Notice('복습 세션 완료!');
    } else {
      useAppStore.setState({
        reviewState: {
          ...state.reviewState,
          currentIndex: nextIndex,
          showAnswer: false,
          selectedOptionId: null,
          blankAnswers: [],
          userAnswer: '',
        },
      });
    }
  }

  private renderCardEditorMode(): void {
    const state = useAppStore.getState();
    const config = state.generationConfig;
    const settings = state.generationSettings;
    const content = this.contentAreaEl.createDiv({ cls: 'sil-card-editor' });

    content.createEl('h3', { text: 'AI 카드 생성' });

    // Mode toggle (Current Note / Batch)
    const modeToggle = content.createDiv({ cls: 'sil-mode-toggle' });

    const currentNoteBtn = modeToggle.createEl('button', {
      cls: `sil-toggle-btn ${config.mode === 'current-note' ? 'active' : ''}`,
      text: '현재 노트'
    });
    currentNoteBtn.onclick = () => {
      useAppStore.getState().setGenerationConfig({ mode: 'current-note' });
      this.refresh();
    };

    const batchBtn = modeToggle.createEl('button', {
      cls: `sil-toggle-btn ${config.mode === 'batch' ? 'active' : ''}`,
      text: '일괄 생성'
    });
    batchBtn.onclick = () => {
      useAppStore.getState().setGenerationConfig({ mode: 'batch' });
      this.refresh();
    };

    // Render mode-specific content
    if (config.mode === 'current-note') {
      this.renderCurrentNoteMode(content, config, settings);
    } else {
      this.renderBatchMode(content, config, settings);
    }

    // Manual creation link
    const manualSection = content.createDiv({ cls: 'sil-manual-link-section' });
    const manualLink = manualSection.createEl('button', { cls: 'sil-link-btn' });
    manualLink.innerHTML = '&#9998; 수동으로 카드 만들기';
    manualLink.onclick = () => this.openManualCardModal();

    // Loading indicator
    if (state.isLoading) {
      const loading = content.createDiv({ cls: 'sil-loading' });
      loading.createSpan({ text: '카드 생성 중...' });
    }

    // Existing cards list (collapsible)
    if (state.learningCards.length > 0) {
      this.renderExistingCardsList(content, state.learningCards);
    }
  }

  private renderCurrentNoteMode(
    container: HTMLElement,
    config: GenerationConfig,
    settings: { defaultCardTypes: LearningCardType[]; defaultCountPerType: number; skipGeneratedNotes: boolean; trackInFrontmatter: boolean }
  ): void {
    const activeFile = this.app.workspace.getActiveFile();
    const state = useAppStore.getState();

    // Note info card
    const noteInfoCard = container.createDiv({ cls: 'sil-note-info-card' });

    if (activeFile) {
      const isGenerated = hasGeneratedCards(activeFile, this.app);
      const generationDate = getGenerationDate(activeFile, this.app);

      const noteIcon = noteInfoCard.createSpan({ cls: 'sil-note-icon', text: '' });
      const noteDetails = noteInfoCard.createDiv({ cls: 'sil-note-details' });

      noteDetails.createEl('div', { text: activeFile.basename, cls: 'sil-note-name' });
      noteDetails.createEl('div', { text: activeFile.parent?.path || '/', cls: 'sil-note-path' });

      const statusDiv = noteDetails.createDiv({ cls: `sil-note-status ${isGenerated ? 'generated' : 'new'}` });
      if (isGenerated && generationDate) {
        statusDiv.innerHTML = `<span class="sil-status-icon">&#10003;</span> ${generationDate.toLocaleDateString()}에 카드 생성됨`;
      } else {
        statusDiv.innerHTML = `<span class="sil-status-icon">&#10024;</span> 카드 생성 가능`;
      }
    } else {
      noteInfoCard.createEl('div', {
        text: '열린 노트가 없습니다. 카드를 생성하려면 노트를 열어주세요.',
        cls: 'sil-note-empty'
      });
    }

    // Selected text preview (if any)
    if (state.selectedText) {
      const selectionPreview = container.createDiv({ cls: 'sil-selection-preview' });
      selectionPreview.createEl('label', { text: '선택된 텍스트:' });
      selectionPreview.createEl('p', {
        text: `"${state.selectedText.slice(0, 150)}${state.selectedText.length > 150 ? '...' : ''}"`,
        cls: 'sil-preview-text'
      });
    }

    // Card type selection
    const typeSection = container.createDiv({ cls: 'sil-type-section' });
    typeSection.createEl('label', { text: '생성할 카드 유형:' });

    const typeCheckboxes = typeSection.createDiv({ cls: 'sil-type-checkboxes' });
    const cardTypes: { value: LearningCardType; label: string; icon: string }[] = [
      { value: 'flashcard', label: '플래시카드', icon: '' },
      { value: 'multiple_choice', label: '객관식', icon: '' },
      { value: 'fill_blank', label: '빈칸 채우기', icon: '' },
      { value: 'short_answer', label: '단답형', icon: '&#9997;' },
    ];

    cardTypes.forEach(type => {
      const label = typeCheckboxes.createEl('label', { cls: 'sil-type-checkbox' });
      const checkbox = label.createEl('input', {
        attr: {
          type: 'checkbox',
          value: type.value,
        }
      });
      checkbox.checked = config.selectedTypes.includes(type.value);
      checkbox.onchange = () => {
        const newTypes = checkbox.checked
          ? [...config.selectedTypes, type.value]
          : config.selectedTypes.filter(t => t !== type.value);
        useAppStore.getState().setGenerationConfig({ selectedTypes: newTypes });
      };
      label.createSpan({ text: ` ${type.label}` });
    });

    // Count per type
    const countSection = container.createDiv({ cls: 'sil-count-section' });
    countSection.createEl('label', { text: '유형당 카드 수:' });
    const countSelect = countSection.createEl('select', { cls: 'sil-select sil-count-select' });
    [1, 2, 3, 4, 5, 7, 10].forEach(num => {
      const opt = countSelect.createEl('option', { text: num.toString(), attr: { value: num.toString() } });
      if (num === config.countPerType) opt.selected = true;
    });
    countSelect.onchange = () => {
      useAppStore.getState().setGenerationConfig({ countPerType: parseInt(countSelect.value) });
    };

    // Generate button
    const generateBtn = container.createEl('button', { cls: 'sil-generate-btn sil-primary-btn' });
    generateBtn.innerHTML = '&#128640; 카드 생성하기';
    generateBtn.disabled = !activeFile || config.selectedTypes.length === 0;
    generateBtn.onclick = async () => {
      if (!activeFile) return;
      await this.handleCurrentNoteGeneration(activeFile, config, settings);
    };
  }

  private renderBatchMode(
    container: HTMLElement,
    config: GenerationConfig,
    settings: { defaultCardTypes: LearningCardType[]; defaultCountPerType: number; skipGeneratedNotes: boolean; trackInFrontmatter: boolean }
  ): void {
    const batchProgress = useAppStore.getState().batchProgress;

    // Folder selection
    const folderSection = container.createDiv({ cls: 'sil-folder-section' });
    folderSection.createEl('label', { text: '폴더 선택:' });

    const folderRow = folderSection.createDiv({ cls: 'sil-folder-row' });
    const folderSelect = folderRow.createEl('select', { cls: 'sil-select sil-folder-select' });

    const folders = getAllFolders(this.app);
    folders.forEach(folder => {
      const displayName = folder === '' ? '/ (루트)' : folder;
      const opt = folderSelect.createEl('option', { text: displayName, attr: { value: folder } });
      if (folder === config.folderPath) opt.selected = true;
    });

    folderSelect.onchange = () => {
      useAppStore.getState().setGenerationConfig({ folderPath: folderSelect.value });
    };

    // Include subfolders toggle
    const subfoldersRow = folderSection.createDiv({ cls: 'sil-checkbox-row' });
    const subfoldersLabel = subfoldersRow.createEl('label');
    const subfoldersCheckbox = subfoldersLabel.createEl('input', { attr: { type: 'checkbox' } });
    subfoldersCheckbox.checked = config.includeSubfolders;
    subfoldersCheckbox.onchange = () => {
      useAppStore.getState().setGenerationConfig({ includeSubfolders: subfoldersCheckbox.checked });
    };
    subfoldersLabel.createSpan({ text: ' 하위 폴더 포함' });

    // Date range (optional)
    const dateSection = container.createDiv({ cls: 'sil-date-section' });
    dateSection.createEl('label', { text: '날짜 범위 (선택):' });

    const dateRow = dateSection.createDiv({ cls: 'sil-date-row' });
    const fromInput = dateRow.createEl('input', {
      attr: { type: 'date', placeholder: 'From' },
      cls: 'sil-date-input'
    });
    if (config.dateRange.from) {
      fromInput.value = config.dateRange.from.toISOString().split('T')[0];
    }
    fromInput.onchange = () => {
      const from = fromInput.value ? new Date(fromInput.value) : null;
      useAppStore.getState().setGenerationConfig({
        dateRange: { ...config.dateRange, from }
      });
    };

    dateRow.createSpan({ text: ' ~ ' });

    const toInput = dateRow.createEl('input', {
      attr: { type: 'date', placeholder: 'To' },
      cls: 'sil-date-input'
    });
    if (config.dateRange.to) {
      toInput.value = config.dateRange.to.toISOString().split('T')[0];
    }
    toInput.onchange = () => {
      const to = toInput.value ? new Date(toInput.value) : null;
      useAppStore.getState().setGenerationConfig({
        dateRange: { ...config.dateRange, to }
      });
    };

    // Skip generated notes toggle
    const skipRow = container.createDiv({ cls: 'sil-checkbox-row' });
    const skipLabel = skipRow.createEl('label');
    const skipCheckbox = skipLabel.createEl('input', { attr: { type: 'checkbox' } });
    skipCheckbox.checked = settings.skipGeneratedNotes;
    skipCheckbox.onchange = () => {
      // This updates the plugin settings
      this.plugin.settings.generation.skipGeneratedNotes = skipCheckbox.checked;
      this.plugin.saveSettings();
    };
    skipLabel.createSpan({ text: ' 이미 생성된 노트 건너뛰기' });

    // Card type selection (same as current note mode)
    const typeSection = container.createDiv({ cls: 'sil-type-section' });
    typeSection.createEl('label', { text: '카드 유형:' });

    const typeCheckboxes = typeSection.createDiv({ cls: 'sil-type-checkboxes' });
    const cardTypes: { value: LearningCardType; label: string }[] = [
      { value: 'flashcard', label: '플래시카드' },
      { value: 'multiple_choice', label: '객관식' },
      { value: 'fill_blank', label: '빈칸 채우기' },
      { value: 'short_answer', label: '단답형' },
    ];

    cardTypes.forEach(type => {
      const label = typeCheckboxes.createEl('label', { cls: 'sil-type-checkbox' });
      const checkbox = label.createEl('input', {
        attr: { type: 'checkbox', value: type.value }
      });
      checkbox.checked = config.selectedTypes.includes(type.value);
      checkbox.onchange = () => {
        const newTypes = checkbox.checked
          ? [...config.selectedTypes, type.value]
          : config.selectedTypes.filter(t => t !== type.value);
        useAppStore.getState().setGenerationConfig({ selectedTypes: newTypes });
      };
      label.createSpan({ text: ` ${type.label}` });
    });

    // Count per type
    const countSection = container.createDiv({ cls: 'sil-count-section' });
    countSection.createEl('label', { text: '유형당 카드 수:' });
    const countSelect = countSection.createEl('select', { cls: 'sil-select sil-count-select' });
    [1, 2, 3, 5, 7, 10].forEach(num => {
      const opt = countSelect.createEl('option', { text: num.toString(), attr: { value: num.toString() } });
      if (num === config.countPerType) opt.selected = true;
    });
    countSelect.onchange = () => {
      useAppStore.getState().setGenerationConfig({ countPerType: parseInt(countSelect.value) });
    };

    // Generate button
    const generateBtn = container.createEl('button', { cls: 'sil-generate-btn sil-primary-btn' });
    generateBtn.innerHTML = '&#128640; 일괄 생성 시작';
    generateBtn.disabled = config.selectedTypes.length === 0 || batchProgress.isRunning;
    generateBtn.onclick = async () => {
      await this.handleBatchGeneration(config, settings);
    };

    // Progress display
    if (batchProgress.isRunning || batchProgress.processed > 0) {
      const progressSection = container.createDiv({ cls: 'sil-batch-progress' });
      progressSection.createEl('h4', { text: '진행 상황' });

      const progressBar = progressSection.createDiv({ cls: 'sil-progress-bar' });
      const progress = batchProgress.total > 0
        ? (batchProgress.processed / batchProgress.total) * 100
        : 0;
      progressBar.createDiv({ cls: 'sil-progress-fill' }).style.width = `${progress}%`;

      const statsRow = progressSection.createDiv({ cls: 'sil-batch-stats' });
      statsRow.createSpan({
        text: `${batchProgress.processed}/${batchProgress.total}개 노트 처리됨`,
        cls: 'sil-stat'
      });
      statsRow.createSpan({
        text: `${batchProgress.succeeded}개 성공`,
        cls: 'sil-stat sil-stat-success'
      });
      if (batchProgress.failed.length > 0) {
        statsRow.createSpan({
          text: `${batchProgress.failed.length}개 실패`,
          cls: 'sil-stat sil-stat-error'
        });
      }

      if (!batchProgress.isRunning && batchProgress.processed > 0) {
        const resetBtn = progressSection.createEl('button', { text: '진행 상황 지우기', cls: 'sil-btn' });
        resetBtn.onclick = () => {
          useAppStore.getState().resetBatchProgress();
          this.refresh();
        };
      }
    }
  }

  private renderExistingCardsList(container: HTMLElement, cards: LearningCard[]): void {
    const existingSection = container.createDiv({ cls: 'sil-existing-cards' });

    // Header with title and delete button
    const headerDiv = existingSection.createDiv({ cls: 'sil-cards-header' });
    headerDiv.createEl('h4', { text: `전체 카드 (${cards.length})` });

    if (cards.length > 0) {
      const deleteBtn = headerDiv.createEl('button', { text: '카드 삭제', cls: 'sil-delete-all-btn' });
      deleteBtn.onclick = () => {
        const currentFile = this.app.workspace.getActiveFile();
        const modal = new DeleteCardsModal(
          this.app,
          cards,
          currentFile,
          async (result: DeleteCardsModalResult) => {
            const cardsToDelete = result.cardsToDelete;
            if (cardsToDelete.length === 0) return;

            // Delete cards
            for (const card of cardsToDelete) {
              await this.plugin.dataService.deleteLearningCard(card.id);
            }

            // Update state
            const remainingCards = cards.filter(c => !cardsToDelete.some(d => d.id === c.id));
            useAppStore.setState({ learningCards: remainingCards });

            new Notice(`${cardsToDelete.length}개의 카드가 삭제되었습니다.`);
            this.refresh();
          }
        );
        modal.open();
      };
    }

    const cardList = existingSection.createDiv({ cls: 'sil-card-list editable' });
    const sortedCards = [...cards].sort((a, b) => b.createdAt - a.createdAt);

    sortedCards.slice(0, 10).forEach(card => {
      const cardItem = cardList.createDiv({ cls: 'sil-card-item' });
      cardItem.createSpan({ text: this.getCardTypeIcon(card.type), cls: 'sil-card-type' });
      cardItem.createSpan({
        text: card.front.slice(0, 40) + (card.front.length > 40 ? '...' : ''),
        cls: 'sil-card-preview'
      });

      const actions = cardItem.createDiv({ cls: 'sil-card-actions' });

      const deleteBtn = actions.createEl('button', { text: '×', cls: 'sil-delete-btn' });
      deleteBtn.onclick = async () => {
        if (confirm('이 카드를 삭제하시겠습니까?')) {
          await this.plugin.dataService.deleteLearningCard(card.id);
          useAppStore.getState().removeLearningCard(card.id);
          this.refresh();
        }
      };
    });

    if (cards.length > 10) {
      existingSection.createEl('p', {
        text: `...외 ${cards.length - 10}개의 카드`,
        cls: 'sil-more-cards'
      });
    }
  }

  private openManualCardModal(): void {
    const activeFile = this.app.workspace.getActiveFile();
    const sourceFile = activeFile?.path || 'manual';

    const modal = new ManualCardModal(this.app, sourceFile, async (result) => {
      await this.plugin.dataService.saveLearningCard(result.card);
      useAppStore.getState().addCard(result.card);
      new Notice('카드가 생성되었습니다!');
      this.refresh();
    });

    modal.open();
  }

  private async handleCurrentNoteGeneration(
    file: TFile,
    config: GenerationConfig,
    settings: { trackInFrontmatter: boolean }
  ): Promise<void> {
    if (!this.plugin.settings.providers[this.plugin.settings.defaultProvider]?.apiKey) {
      new Notice('먼저 AI 제공자를 설정해주세요');
      useAppStore.setState({ currentMode: 'settings' });
      return;
    }

    const state = useAppStore.getState();
    useAppStore.setState({ isLoading: true });

    try {
      // Use selected text if available, otherwise read full file
      const text = state.selectedText || await this.app.vault.cachedRead(file);

      const result = await this.plugin.questionGeneratorService.generateFromText(
        text,
        file.path,
        {
          types: config.selectedTypes,
          countPerType: config.countPerType,
        }
      );

      if (result.cards.length > 0) {
        for (const card of result.cards) {
          await this.plugin.dataService.saveLearningCard(card);
          useAppStore.getState().addCard(card);
        }

        // Mark file as generated if tracking enabled
        if (settings.trackInFrontmatter) {
          await markAsGenerated(file, this.app);
        }

        new Notice(`${result.cards.length}개의 학습 카드가 생성되었습니다!`);
      } else {
        new Notice('텍스트에서 카드를 생성할 수 없습니다');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Error: ${errorMessage}`);
    } finally {
      useAppStore.setState({ isLoading: false, selectedText: '' });
      this.refresh();
    }
  }

  private async handleBatchGeneration(
    config: GenerationConfig,
    settings: { skipGeneratedNotes: boolean; trackInFrontmatter: boolean }
  ): Promise<void> {
    if (!this.plugin.settings.providers[this.plugin.settings.defaultProvider]?.apiKey) {
      new Notice('먼저 AI 제공자를 설정해주세요');
      useAppStore.setState({ currentMode: 'settings' });
      return;
    }

    // Get files to process
    let files = getMarkdownFilesInFolder(this.app, config.folderPath, config.includeSubfolders);

    // Filter by date range
    files = filterFilesByDateRange(files, config.dateRange.from, config.dateRange.to);

    // Filter out already generated notes if enabled
    if (settings.skipGeneratedNotes) {
      files = filterUngenerated(files, this.app);
    }

    if (files.length === 0) {
      new Notice('일치하는 노트를 찾을 수 없습니다');
      return;
    }

    // Initialize progress
    useAppStore.getState().setBatchProgress({
      total: files.length,
      processed: 0,
      succeeded: 0,
      failed: [],
      isRunning: true,
    });

    this.refresh();

    // Process files one by one
    for (const file of files) {
      try {
        const text = await this.app.vault.cachedRead(file);

        // Skip very short files
        if (text.trim().length < 100) {
          useAppStore.getState().setBatchProgress({
            processed: useAppStore.getState().batchProgress.processed + 1,
          });
          continue;
        }

        const result = await this.plugin.questionGeneratorService.generateFromText(
          text,
          file.path,
          {
            types: config.selectedTypes,
            countPerType: config.countPerType,
          }
        );

        if (result.cards.length > 0) {
          for (const card of result.cards) {
            await this.plugin.dataService.saveLearningCard(card);
            useAppStore.getState().addCard(card);
          }

          // Mark file as generated
          if (settings.trackInFrontmatter) {
            await markAsGenerated(file, this.app);
          }

          useAppStore.getState().setBatchProgress({
            processed: useAppStore.getState().batchProgress.processed + 1,
            succeeded: useAppStore.getState().batchProgress.succeeded + 1,
          });
        } else {
          useAppStore.getState().setBatchProgress({
            processed: useAppStore.getState().batchProgress.processed + 1,
          });
        }
      } catch (error) {
        useAppStore.getState().setBatchProgress({
          processed: useAppStore.getState().batchProgress.processed + 1,
          failed: [...useAppStore.getState().batchProgress.failed, file.path],
        });
      }

      // Update UI periodically
      this.refresh();

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark as complete
    useAppStore.getState().setBatchProgress({ isRunning: false });
    new Notice(`일괄 생성 완료! ${useAppStore.getState().batchProgress.succeeded}개 노트가 처리되었습니다.`);
    this.refresh();
  }

  private async handleGenerateCards(text: string): Promise<void> {
    if (!this.plugin.settings.providers[this.plugin.settings.defaultProvider]?.apiKey) {
      new Notice('먼저 AI 제공자를 설정해주세요');
      useAppStore.setState({ currentMode: 'settings' });
      return;
    }

    useAppStore.setState({ isLoading: true });

    try {
      const result = await this.plugin.questionGeneratorService.generateMixedQuestions(
        text,
        this.app.workspace.getActiveFile()?.path || 'selection',
        5
      );

      if (result.cards.length > 0) {
        for (const card of result.cards) {
          await this.plugin.dataService.saveLearningCard(card);
          useAppStore.getState().addCard(card);
        }
        new Notice(`${result.cards.length}개의 학습 카드가 생성되었습니다!`);
      } else {
        new Notice('텍스트에서 카드를 생성할 수 없습니다');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Error: ${errorMessage}`);
    } finally {
      useAppStore.setState({ isLoading: false, selectedText: '' });
    }
  }

  private renderSettingsMode(): void {
    const content = this.contentAreaEl.createDiv({ cls: 'sil-settings' });
    content.createEl('h3', { text: '설정' });

    const providers = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'] as const;
    const currentProvider = this.plugin.settings.defaultProvider;

    providers.forEach(provider => {
      const config = this.plugin.settings.providers[provider];
      const isDefault = currentProvider === provider;

      const providerDiv = content.createDiv({ cls: `sil-provider ${isDefault ? 'default' : ''}` });

      const header = providerDiv.createDiv({ cls: 'sil-provider-header' });
      header.createEl('strong', { text: provider.toUpperCase() + (isDefault ? ' (기본)' : '') });
      header.createSpan({
        text: config.apiKey ? ' ✓ 설정됨' : ' 미설정',
        cls: config.apiKey ? 'sil-ok' : 'sil-warn'
      });

      const apiKeyInput = providerDiv.createEl('input', {
        attr: {
          type: 'password',
          placeholder: 'API 키...',
          value: config.apiKey || ''
        }
      });

      apiKeyInput.onchange = async () => {
        await this.plugin.updateProviderConfig(provider, { apiKey: apiKeyInput.value });
        this.refresh();
      };

      const actions = providerDiv.createDiv({ cls: 'sil-provider-actions' });

      const testBtn = actions.createEl('button', { text: '테스트' });
      testBtn.onclick = async () => {
        testBtn.disabled = true;
        testBtn.textContent = '테스트 중...';
        try {
          const ok = await this.plugin.aiService.testConnection(provider);
          new Notice(ok ? `✓ ${provider} 연결됨!` : `✗ ${provider} 실패`);
          testBtn.textContent = ok ? '✓ OK' : '✗ 실패';
        } catch (e) {
          new Notice(`오류: ${e}`);
          testBtn.textContent = '✗ 오류';
        }
        testBtn.disabled = false;
        setTimeout(() => { testBtn.textContent = '테스트'; }, 2000);
      };

      if (!isDefault) {
        const setDefaultBtn = actions.createEl('button', { text: '기본으로 설정' });
        setDefaultBtn.onclick = async () => {
          await this.plugin.setDefaultProvider(provider);
          this.refresh();
        };
      }
    });

    const settingsLink = content.createDiv({ cls: 'sil-settings-link' });
    settingsLink.createEl('p', { text: '더 많은 옵션은 다음에서 설정하세요:' });
    settingsLink.createEl('strong', { text: '설정 → 커뮤니티 플러그인 → Star InfoLearn' });
  }

  private renderFooter(container: HTMLElement): void {
    const state = useAppStore.getState();
    const footer = container.createDiv({ cls: 'sil-footer' });

    footer.createSpan({ text: `AI: ${state.currentAIProvider}` });
    footer.createSpan({ text: state.isLoading ? ' | 처리 중...' : ' | 준비됨' });
  }

  private getCardTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'flashcard': '📇',
      'fill_blank': '📝',
      'multiple_choice': '🔘',
      'short_answer': '✍️',
    };
    return icons[type] || '📋';
  }

  private getCardTypeName(type: string): string {
    const names: Record<string, string> = {
      'flashcard': '플래시카드',
      'fill_blank': '빈칸 채우기',
      'multiple_choice': '객관식',
      'short_answer': '단답형',
    };
    return names[type] || type;
  }
}
