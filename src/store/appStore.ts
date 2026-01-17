/**
 * Global App State Management using Zustand (Simplified)
 * FSRS Learning System with 4 modes: study, review, card-editor, settings
 */

import create from 'zustand';
import { AIProvider, AIProviderConfig } from '../types/ai';
import { LearningCard, LearningCardType, Deck, StudyPreferences, DEFAULT_STUDY_PREFERENCES } from '../types/learning';
import { StudySession, LearningStats, SchedulingCards } from '../types/fsrs';

/**
 * Generation settings from plugin settings
 */
export interface GenerationSettings {
  defaultCardTypes: LearningCardType[];
  defaultCountPerType: number;
  skipGeneratedNotes: boolean;
  trackInFrontmatter: boolean;
}

/**
 * Current generation configuration (UI state)
 */
export interface GenerationConfig {
  mode: 'current-note' | 'batch';
  selectedTypes: LearningCardType[];
  countPerType: number;
  // Batch mode options
  folderPath: string;
  dateRange: { from: Date | null; to: Date | null };
  includeSubfolders: boolean;
}

/**
 * Batch generation progress tracking
 */
export interface BatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: string[];
  isRunning: boolean;
}

/**
 * Default generation config
 */
const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  mode: 'current-note',
  selectedTypes: ['flashcard', 'multiple_choice'],
  countPerType: 3,
  folderPath: '',
  dateRange: { from: null, to: null },
  includeSubfolders: false,
};

/**
 * Default batch progress
 */
const DEFAULT_BATCH_PROGRESS: BatchProgress = {
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: [],
  isRunning: false,
};

/**
 * Application view modes (simplified to 4)
 */
export type AppMode = 'study' | 'review' | 'card-editor' | 'settings' | null;

/**
 * Review state during a study session
 */
export interface ReviewState {
  /** Current card being reviewed */
  currentCard: LearningCard | null;
  /** Current card index in queue */
  currentIndex: number;
  /** Whether card is flipped (showing answer) */
  isFlipped: boolean;
  /** Scheduling options for current card */
  schedulingOptions: SchedulingCards | null;
  /** Time when card was shown */
  cardShowTime: number | null;
  /** User's answer (for text-based cards) */
  userAnswer: string;
  /** Whether answer has been submitted */
  isAnswerSubmitted: boolean;
  /** Evaluation result from AI */
  evaluationResult: {
    isCorrect: boolean;
    score: number;
    feedback: string;
  } | null;
  /** Review queue (card IDs) */
  queue: string[];
  /** Whether session is active */
  isActive: boolean;
  /** Whether to show answer */
  showAnswer: boolean;
  /** Selected MCQ option ID (for multiple choice) */
  selectedOptionId: string | null;
  /** User's blank answers (for fill_blank) */
  blankAnswers: string[];
}

export interface AppStateData {
  // UI State
  currentMode: AppMode;
  selectedText: string;
  isLoading: boolean;
  error: string | null;

  // AI State
  currentAIProvider: AIProvider;
  aiProviders: Record<AIProvider, AIProviderConfig>;

  // Learning Cards
  learningCards: LearningCard[];
  currentDeckId: string | null;
  decks: Deck[];

  // Study Session
  studySession: StudySession | null;
  reviewState: ReviewState;

  // Statistics
  learningStats: LearningStats | null;
  todayStats: {
    reviewed: number;
    newLearned: number;
    dueRemaining: number;
    streak: number;
  };

  // Study Preferences
  studyPreferences: StudyPreferences;

  // Generation State
  generationSettings: GenerationSettings;
  generationConfig: GenerationConfig;
  batchProgress: BatchProgress;
}

export interface AppState extends AppStateData {
  // Convenience accessors
  cards: LearningCard[];
  addCard: (card: LearningCard) => void;
  updateCard: (card: LearningCard) => void;

  // UI Actions
  setCurrentMode: (mode: AppMode) => void;
  setSelectedText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // AI Actions
  setAIProvider: (provider: AIProvider) => void;
  updateAIProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;

  // Learning Cards Actions
  setLearningCards: (cards: LearningCard[]) => void;
  addLearningCard: (card: LearningCard) => void;
  updateLearningCard: (cardId: string, updates: Partial<LearningCard>) => void;
  removeLearningCard: (cardId: string) => void;

  // Decks Actions
  setDecks: (decks: Deck[]) => void;
  setCurrentDeck: (deckId: string | null) => void;
  addDeck: (deck: Deck) => void;
  updateDeck: (deckId: string, updates: Partial<Deck>) => void;
  removeDeck: (deckId: string) => void;

  // Study Session Actions
  startStudySession: (session: StudySession) => void;
  endStudySession: () => void;
  updateStudySession: (updates: Partial<StudySession>) => void;

  // Review State Actions
  setCurrentCard: (card: LearningCard | null) => void;
  flipCard: () => void;
  setSchedulingOptions: (options: SchedulingCards | null) => void;
  setUserAnswer: (answer: string) => void;
  submitAnswer: () => void;
  setEvaluationResult: (result: ReviewState['evaluationResult']) => void;
  resetReviewState: () => void;
  nextCard: () => void;
  setSelectedOptionId: (optionId: string | null) => void;
  setBlankAnswers: (answers: string[]) => void;

  // Statistics Actions
  setLearningStats: (stats: LearningStats | null) => void;
  updateTodayStats: (stats: Partial<AppStateData['todayStats']>) => void;

  // Preferences Actions
  setStudyPreferences: (prefs: Partial<StudyPreferences>) => void;

  // Generation Actions
  setGenerationConfig: (config: Partial<GenerationConfig>) => void;
  setBatchProgress: (progress: Partial<BatchProgress>) => void;
  resetBatchProgress: () => void;

  // Reset
  reset: () => void;
}

/**
 * Initial review state
 */
const initialReviewState: ReviewState = {
  currentCard: null,
  currentIndex: 0,
  isFlipped: false,
  schedulingOptions: null,
  cardShowTime: null,
  userAnswer: '',
  isAnswerSubmitted: false,
  evaluationResult: null,
  queue: [],
  isActive: false,
  showAnswer: false,
  selectedOptionId: null,
  blankAnswers: [],
};

const initialState: AppStateData = {
  currentMode: null,
  selectedText: '',
  isLoading: false,
  error: null,
  currentAIProvider: 'gemini' as AIProvider,
  aiProviders: {
    openai: { provider: 'openai' as AIProvider, apiKey: '', model: 'gpt-4-turbo' },
    anthropic: { provider: 'anthropic' as AIProvider, apiKey: '', model: 'claude-3-opus' },
    gemini: { provider: 'gemini' as AIProvider, apiKey: '', model: 'gemini-2.0-flash' },
    grok: { provider: 'grok' as AIProvider, apiKey: '', model: 'grok-3' },
    zhipu: { provider: 'zhipu' as AIProvider, apiKey: '', model: 'glm-4.7', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  },
  learningCards: [],
  currentDeckId: null,
  decks: [],
  studySession: null,
  reviewState: initialReviewState,
  learningStats: null,
  todayStats: {
    reviewed: 0,
    newLearned: 0,
    dueRemaining: 0,
    streak: 0,
  },
  studyPreferences: DEFAULT_STUDY_PREFERENCES,
  // Generation state
  generationSettings: {
    defaultCardTypes: ['flashcard', 'multiple_choice'],
    defaultCountPerType: 3,
    skipGeneratedNotes: true,
    trackInFrontmatter: true,
  },
  generationConfig: DEFAULT_GENERATION_CONFIG,
  batchProgress: DEFAULT_BATCH_PROGRESS,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState as AppState,

  // Convenience Accessors
  get cards() {
    return get().learningCards;
  },

  addCard: (card: LearningCard) => {
    set((state) => ({
      learningCards: [...state.learningCards, card],
    }));
  },

  updateCard: (card: LearningCard) => {
    set((state) => ({
      learningCards: state.learningCards.map((c) =>
        c.id === card.id ? { ...card, updatedAt: Date.now() } : c
      ),
    }));
  },

  // UI Actions
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setSelectedText: (text) => set({ selectedText: text }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // AI Actions
  setAIProvider: (provider) => set({ currentAIProvider: provider }),

  updateAIProviderConfig: (provider, config) =>
    set((state) => ({
      aiProviders: {
        ...state.aiProviders,
        [provider]: {
          ...state.aiProviders[provider],
          ...config,
        },
      },
    })),

  // Learning Cards Actions
  setLearningCards: (cards) => set({ learningCards: cards }),

  addLearningCard: (card) =>
    set((state) => ({
      learningCards: [...state.learningCards, card],
    })),

  updateLearningCard: (cardId, updates) =>
    set((state) => ({
      learningCards: state.learningCards.map((card) =>
        card.id === cardId ? { ...card, ...updates, updatedAt: Date.now() } : card
      ),
    })),

  removeLearningCard: (cardId) =>
    set((state) => ({
      learningCards: state.learningCards.filter((card) => card.id !== cardId),
    })),

  // Decks Actions
  setDecks: (decks) => set({ decks }),
  setCurrentDeck: (deckId) => set({ currentDeckId: deckId }),

  addDeck: (deck) =>
    set((state) => ({
      decks: [...state.decks, deck],
    })),

  updateDeck: (deckId, updates) =>
    set((state) => ({
      decks: state.decks.map((deck) =>
        deck.id === deckId ? { ...deck, ...updates } : deck
      ),
    })),

  removeDeck: (deckId) =>
    set((state) => ({
      decks: state.decks.filter((deck) => deck.id !== deckId),
    })),

  // Study Session Actions
  startStudySession: (session) =>
    set({
      studySession: session,
      currentMode: 'review',
      reviewState: {
        ...initialReviewState,
        cardShowTime: Date.now(),
      },
    }),

  endStudySession: () =>
    set({
      studySession: null,
      currentMode: 'study',
      reviewState: initialReviewState,
    }),

  updateStudySession: (updates) =>
    set((state) => ({
      studySession: state.studySession
        ? { ...state.studySession, ...updates }
        : null,
    })),

  // Review State Actions
  setCurrentCard: (card) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        currentCard: card,
        isFlipped: false,
        cardShowTime: Date.now(),
        userAnswer: '',
        isAnswerSubmitted: false,
        evaluationResult: null,
        selectedOptionId: null,
        blankAnswers: card?.blanks?.map(() => '') || [],
      },
    })),

  flipCard: () =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        isFlipped: !state.reviewState.isFlipped,
      },
    })),

  setSchedulingOptions: (options) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        schedulingOptions: options,
      },
    })),

  setUserAnswer: (answer) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        userAnswer: answer,
      },
    })),

  submitAnswer: () =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        isAnswerSubmitted: true,
        isFlipped: true,
      },
    })),

  setEvaluationResult: (result) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        evaluationResult: result,
      },
    })),

  resetReviewState: () =>
    set({
      reviewState: initialReviewState,
    }),

  nextCard: () =>
    set((state) => {
      const session = state.studySession;
      if (!session) return state;

      const nextIndex = state.reviewState.currentIndex + 1;

      if (nextIndex >= session.queue.length) {
        return {
          ...state,
          studySession: { ...session, isActive: false },
          reviewState: initialReviewState,
          currentMode: 'study' as AppMode,
        };
      }

      return {
        ...state,
        reviewState: {
          ...initialReviewState,
          currentIndex: nextIndex,
          cardShowTime: Date.now(),
        },
      };
    }),

  setSelectedOptionId: (optionId) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        selectedOptionId: optionId,
      },
    })),

  setBlankAnswers: (answers) =>
    set((state) => ({
      reviewState: {
        ...state.reviewState,
        blankAnswers: answers,
      },
    })),

  // Statistics Actions
  setLearningStats: (stats) => set({ learningStats: stats }),

  updateTodayStats: (stats) =>
    set((state) => ({
      todayStats: {
        ...state.todayStats,
        ...stats,
      },
    })),

  // Preferences Actions
  setStudyPreferences: (prefs) =>
    set((state) => ({
      studyPreferences: {
        ...state.studyPreferences,
        ...prefs,
      },
    })),

  // Generation Actions
  setGenerationConfig: (config) =>
    set((state) => ({
      generationConfig: {
        ...state.generationConfig,
        ...config,
      },
    })),

  setBatchProgress: (progress) =>
    set((state) => ({
      batchProgress: {
        ...state.batchProgress,
        ...progress,
      },
    })),

  resetBatchProgress: () =>
    set({
      batchProgress: DEFAULT_BATCH_PROGRESS,
    }),

  // Reset
  reset: () => set(initialState),
}));
