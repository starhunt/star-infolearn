/**
 * Learning Card Types (Simplified)
 * Core data models for the Star InfoLearn plugin
 *
 * 4 card types:
 * - flashcard: Standard front/back flashcard
 * - fill_blank: Fill in the blank
 * - multiple_choice: Multiple choice question (4 options)
 * - short_answer: Short answer question
 */

import { FSRSCardState, DEFAULT_CARD_STATE } from './fsrs';

/**
 * Learning card types (simplified to 4)
 */
export type LearningCardType = 'flashcard' | 'fill_blank' | 'multiple_choice' | 'short_answer';

/**
 * Multiple choice option
 */
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/**
 * Blank position for fill_blank cards
 */
export interface BlankPosition {
  /** Start position in text */
  position: number;
  /** The answer for this blank */
  answer: string;
}

/**
 * Core learning card structure (simplified)
 */
export interface LearningCard {
  /** Unique identifier */
  id: string;
  /** Card type */
  type: LearningCardType;
  /** Source note file path */
  sourceFile: string;
  /** Original source text (for reference) */
  sourceText?: string;

  /** Question / Front side */
  front: string;
  /** Answer / Back side */
  back: string;
  /** Optional hint */
  hint?: string;
  /** Explanation shown after answer */
  explanation?: string;

  /** MCQ options (for multiple_choice type) */
  options?: MCQOption[];
  /** Blank positions (for fill_blank type) */
  blanks?: BlankPosition[];

  /** Tags for organization */
  tags: string[];
  /** Difficulty level (1-5) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** FSRS scheduling state */
  fsrsState: FSRSCardState;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Factory function for creating a new learning card
 */
export function createLearningCard(
  partial: Partial<LearningCard> & Pick<LearningCard, 'type' | 'sourceFile' | 'front' | 'back'>
): LearningCard {
  const now = Date.now();
  return {
    id: partial.id || `card_${now}_${Math.random().toString(36).substr(2, 9)}`,
    type: partial.type,
    sourceFile: partial.sourceFile,
    sourceText: partial.sourceText,
    front: partial.front,
    back: partial.back,
    hint: partial.hint,
    explanation: partial.explanation,
    options: partial.options,
    blanks: partial.blanks,
    tags: partial.tags || [],
    difficulty: partial.difficulty || 3,
    fsrsState: partial.fsrsState || { ...DEFAULT_CARD_STATE },
    createdAt: partial.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Deck/collection of learning cards
 */
export interface Deck {
  /** Unique identifier */
  id: string;
  /** Deck name */
  name: string;
  /** Description */
  description?: string;
  /** Card IDs in this deck */
  cardIds: string[];
  /** Parent deck ID (for nested decks) */
  parentId?: string;
  /** Sub-deck IDs */
  childIds: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last studied timestamp */
  lastStudied: number | null;
  /** Settings specific to this deck */
  settings?: {
    newCardsPerDay?: number;
    reviewsPerDay?: number;
  };
}

/**
 * Answer evaluation result from AI
 */
export interface AnswerEvaluation {
  /** Is the answer correct */
  isCorrect: boolean;
  /** Correctness score (0-1) for partial credit */
  score: number;
  /** AI feedback on the answer */
  feedback: string;
  /** Key points that were correct */
  correctPoints?: string[];
  /** Key points that were missed */
  missedPoints?: string[];
  /** Suggested improvement */
  suggestion?: string;
}

/**
 * Question generation request
 */
export interface QuestionGenerationRequest {
  /** Source text */
  content: string;
  /** Desired question types */
  questionTypes: LearningCardType[];
  /** Number of questions per type */
  countPerType: number;
  /** Target difficulty (1-5) */
  targetDifficulty?: number;
  /** Language for questions */
  language?: string;
  /** Context/topic for better questions */
  context?: string;
}

/**
 * Question generation result
 */
export interface QuestionGenerationResult {
  /** Generated cards */
  cards: LearningCard[];
  /** AI confidence in generation quality */
  confidence: number;
  /** Concepts identified */
  concepts: string[];
  /** Any warnings or notes */
  notes?: string[];
}

/**
 * Study preferences
 */
export interface StudyPreferences {
  /** Preferred card types */
  preferredCardTypes: LearningCardType[];
  /** Show timer during review */
  showTimer: boolean;
  /** Enable keyboard shortcuts */
  keyboardShortcuts: boolean;
  /** Flip animation style */
  flipAnimation: 'none' | 'flip' | 'fade';
  /** Font size multiplier */
  fontSizeMultiplier: number;
  /** High contrast mode */
  highContrast: boolean;
}

/**
 * Default study preferences
 */
export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  preferredCardTypes: ['flashcard', 'fill_blank', 'multiple_choice'],
  showTimer: true,
  keyboardShortcuts: true,
  flipAnimation: 'flip',
  fontSizeMultiplier: 1.0,
  highContrast: false,
};
