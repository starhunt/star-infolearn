/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Types
 * Based on FSRS-4.5 algorithm used in Anki 23.10+
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

/**
 * Rating given by user after reviewing a card
 * 1 = Again (complete failure to recall)
 * 2 = Hard (recalled with significant difficulty)
 * 3 = Good (recalled with some effort)
 * 4 = Easy (recalled effortlessly)
 */
export type Rating = 1 | 2 | 3 | 4;

export const RATING = {
  AGAIN: 1 as Rating,
  HARD: 2 as Rating,
  GOOD: 3 as Rating,
  EASY: 4 as Rating,
} as const;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

/**
 * Card state in the FSRS system
 * - New: Never reviewed
 * - Learning: In initial learning phase
 * - Review: Graduated to regular review
 * - Relearning: Failed review, back to learning
 */
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * FSRS parameters - algorithm tuning constants
 * Default values based on FSRS-4.5
 */
export interface FSRSParameters {
  /** Request retention - target probability of recall */
  requestRetention: number;
  /** Maximum interval in days */
  maximumInterval: number;
  /** Weights for the FSRS algorithm (w[0] to w[18]) */
  w: number[];
  /** Enable fuzzing to add slight randomness to intervals */
  enableFuzz: boolean;
}

/**
 * Default FSRS-4.5 parameters
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years
  enableFuzz: true,
  w: [
    0.4072, // w0 - initial stability for Again
    1.1829, // w1 - initial stability for Hard
    3.1262, // w2 - initial stability for Good
    15.4722, // w3 - initial stability for Easy
    7.2102, // w4 - stability increase factor
    0.5316, // w5 - stability decrease factor for Again
    1.0651, // w6 - stability factor for Hard
    0.0234, // w7 - stability factor for Easy
    1.616, // w8 - difficulty factor
    0.1544, // w9 - difficulty mean reversion
    1.0824, // w10 - stability after lapse (Again)
    1.9813, // w11 - stability after lapse (Hard)
    0.0953, // w12 - difficulty penalty for Again
    0.2975, // w13 - difficulty penalty for Hard
    2.2042, // w14 - difficulty bonus for Easy
    0.2407, // w15 - short-term stability factor
    2.9466, // w16 - long-term stability factor
    0.5034, // w17 - retrievability decay
    0.6567, // w18 - additional stability factor
  ],
};

/**
 * FSRS card state - tracks learning progress
 */
export interface FSRSCardState {
  /** Current state of the card */
  state: CardState;
  /** Difficulty rating (1-10, where 1 is easiest) */
  difficulty: number;
  /** Memory stability in days */
  stability: number;
  /** Current retrievability (0-1) */
  retrievability: number;
  /** Number of successful reviews (lapses reset this) */
  reps: number;
  /** Number of times the card was forgotten (rated Again in Review state) */
  lapses: number;
  /** Last review timestamp (Unix ms) */
  lastReview: number | null;
  /** Next scheduled review timestamp (Unix ms) */
  nextReview: number;
  /** Scheduled interval in days */
  scheduledDays: number;
  /** Elapsed days since last review */
  elapsedDays: number;
}

/**
 * Default state for a new card
 */
export const DEFAULT_CARD_STATE: FSRSCardState = {
  state: 'new',
  difficulty: 0,
  stability: 0,
  retrievability: 0,
  reps: 0,
  lapses: 0,
  lastReview: null,
  nextReview: Date.now(),
  scheduledDays: 0,
  elapsedDays: 0,
};

/**
 * Review log entry - tracks each review
 */
export interface ReviewLog {
  /** Card ID */
  cardId: string;
  /** Review timestamp (Unix ms) */
  timestamp: number;
  /** Rating given */
  rating: Rating;
  /** State before review */
  stateBefore: CardState;
  /** State after review */
  stateAfter: CardState;
  /** Scheduled interval after review (days) */
  scheduledDays: number;
  /** Actual elapsed days since last review */
  elapsedDays: number;
  /** Time spent on review (ms) */
  reviewDuration: number;
}

/**
 * Scheduling info for a single rating option
 */
export interface SchedulingInfo {
  /** The rating this info is for */
  rating: Rating;
  /** New card state after this rating */
  newState: FSRSCardState;
  /** Interval until next review (days) */
  interval: number;
  /** Human-readable interval text */
  intervalText: string;
}

/**
 * All scheduling options for a card
 */
export interface SchedulingCards {
  again: SchedulingInfo;
  hard: SchedulingInfo;
  good: SchedulingInfo;
  easy: SchedulingInfo;
}

/**
 * Daily study statistics
 */
export interface DailyStats {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Cards reviewed */
  reviewed: number;
  /** New cards learned */
  newLearned: number;
  /** Cards failed (rated Again) */
  failed: number;
  /** Total review time (ms) */
  totalTime: number;
  /** Average accuracy (0-1) */
  averageAccuracy: number;
  /** Cards due but not reviewed */
  cardsSkipped: number;
}

/**
 * Overall learning statistics
 */
export interface LearningStats {
  /** Total cards in system */
  totalCards: number;
  /** Cards by state */
  byState: Record<CardState, number>;
  /** Cards due for review */
  dueCards: number;
  /** Cards due today that are overdue */
  overdueCards: number;
  /** Average retention rate */
  retentionRate: number;
  /** Total reviews completed */
  totalReviews: number;
  /** Current streak (consecutive days studied) */
  streak: number;
  /** Best streak ever */
  bestStreak: number;
  /** Average daily reviews */
  averageDailyReviews: number;
  /** Predicted retention for next week */
  predictedRetention: number;
}

/**
 * Study session configuration
 */
export interface StudySessionConfig {
  /** Maximum new cards per day */
  newCardsPerDay: number;
  /** Maximum reviews per day (0 = unlimited) */
  maxReviewsPerDay: number;
  /** Learning steps in minutes for new cards */
  learningSteps: number[];
  /** Relearning steps in minutes for failed reviews */
  relearningSteps: number[];
  /** Graduating interval (days) */
  graduatingInterval: number;
  /** Easy interval for first review */
  easyInterval: number;
  /** Enable adaptive learning (adjust based on performance) */
  adaptiveLearning: boolean;
}

/**
 * Default study session configuration
 */
export const DEFAULT_STUDY_CONFIG: StudySessionConfig = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  learningSteps: [1, 10], // 1 min, 10 min
  relearningSteps: [10], // 10 min
  graduatingInterval: 1, // 1 day
  easyInterval: 4, // 4 days
  adaptiveLearning: true,
};

/**
 * Review queue item
 */
export interface ReviewQueueItem {
  cardId: string;
  dueDate: number;
  state: CardState;
  priority: number; // Lower = higher priority
}

/**
 * Study session state
 */
export interface StudySession {
  /** Session ID */
  id: string;
  /** Session start time */
  startTime: number;
  /** Cards in this session's queue */
  queue: ReviewQueueItem[];
  /** Current card index */
  currentIndex: number;
  /** Cards reviewed in this session */
  reviewedCount: number;
  /** New cards learned in this session */
  newLearnedCount: number;
  /** Cards failed in this session */
  failedCount: number;
  /** Is session active */
  isActive: boolean;
}
