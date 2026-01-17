/**
 * FSRS (Free Spaced Repetition Scheduler) Service
 * Implements FSRS-4.5 algorithm for optimal spaced repetition scheduling
 *
 * Based on: https://github.com/open-spaced-repetition/fsrs4anki
 * Paper: A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling
 */

import {
  Rating,
  RATING,
  CardState,
  FSRSParameters,
  DEFAULT_FSRS_PARAMETERS,
  FSRSCardState,
  DEFAULT_CARD_STATE,
  ReviewLog,
  SchedulingInfo,
  SchedulingCards,
  StudySession,
  ReviewQueueItem,
  StudySessionConfig,
  DEFAULT_STUDY_CONFIG,
  DailyStats,
  LearningStats,
} from '../types/fsrs';
import { LearningCard } from '../types/learning';

/**
 * FSRS Service - Core spaced repetition scheduling
 */
export class FSRSService {
  private parameters: FSRSParameters;
  private config: StudySessionConfig;

  constructor(
    parameters: Partial<FSRSParameters> = {},
    config: Partial<StudySessionConfig> = {}
  ) {
    this.parameters = { ...DEFAULT_FSRS_PARAMETERS, ...parameters };
    this.config = { ...DEFAULT_STUDY_CONFIG, ...config };
  }

  /**
   * Update FSRS parameters
   */
  updateParameters(params: Partial<FSRSParameters>): void {
    this.parameters = { ...this.parameters, ...params };
  }

  /**
   * Update study configuration
   */
  updateConfig(config: Partial<StudySessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current parameters
   */
  getParameters(): FSRSParameters {
    return { ...this.parameters };
  }

  /**
   * Get current config
   */
  getConfig(): StudySessionConfig {
    return { ...this.config };
  }

  /**
   * Calculate the initial difficulty for a card based on first rating
   * D0(G) formula from FSRS-4.5
   */
  private initDifficulty(rating: Rating): number {
    const w = this.parameters.w;
    // D0(G) = w[4] - exp(w[5] * (G - 1)) + 1
    return w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  }

  /**
   * Calculate initial stability for a card based on rating
   * S0(G) formula from FSRS-4.5
   */
  private initStability(rating: Rating): number {
    const w = this.parameters.w;
    // S0(G) = w[G-1] for G in {1,2,3,4}
    return w[rating - 1];
  }

  /**
   * Calculate new difficulty after a review
   * D'(D, G) formula from FSRS-4.5
   */
  private nextDifficulty(difficulty: number, rating: Rating): number {
    const w = this.parameters.w;
    // Linear interpolation with mean reversion
    // D'(D, G) = w[6] * D0(3) + (1 - w[6]) * (D - w[7] * (G - 3))
    const d0 = this.initDifficulty(RATING.GOOD); // D0(3)
    let newD = w[6] * d0 + (1 - w[6]) * (difficulty - w[7] * (rating - 3));

    // Constrain difficulty to [1, 10]
    newD = Math.max(1, Math.min(10, newD));
    return newD;
  }

  /**
   * Calculate retrievability (probability of recall)
   * R(t, S) = exp(ln(0.9) * t / S)
   */
  private calculateRetrievability(elapsedDays: number, stability: number): number {
    if (stability <= 0) return 0;
    const factor = Math.log(0.9);
    return Math.exp(factor * elapsedDays / stability);
  }

  /**
   * Calculate new stability after a successful review (rating >= 2)
   * S'(D, S, R, G) formula from FSRS-4.5
   */
  private nextStabilityAfterSuccess(
    difficulty: number,
    stability: number,
    retrievability: number,
    rating: Rating
  ): number {
    const w = this.parameters.w;

    // Hard penalty factor
    const hardPenalty = rating === RATING.HARD ? w[15] : 1;

    // Easy bonus factor
    const easyBonus = rating === RATING.EASY ? w[16] : 1;

    // S'(D, S, R, G) = S * (e^(w[8]) * (11 - D) * S^(-w[9]) * (e^(w[10] * (1 - R)) - 1) * hardPenalty * easyBonus + 1)
    const newS = stability * (
      Math.exp(w[8]) *
      (11 - difficulty) *
      Math.pow(stability, -w[9]) *
      (Math.exp(w[10] * (1 - retrievability)) - 1) *
      hardPenalty *
      easyBonus +
      1
    );

    return newS;
  }

  /**
   * Calculate new stability after a failed review (rating = 1)
   * S'(D, S, R) formula for forgetting from FSRS-4.5
   */
  private nextStabilityAfterFailure(
    difficulty: number,
    stability: number,
    retrievability: number
  ): number {
    const w = this.parameters.w;

    // S'(D, S, R) = w[11] * D^(-w[12]) * ((S + 1)^w[13] - 1) * e^(w[14] * (1 - R))
    const newS = w[11] *
      Math.pow(difficulty, -w[12]) *
      (Math.pow(stability + 1, w[13]) - 1) *
      Math.exp(w[14] * (1 - retrievability));

    return Math.max(0.1, newS); // Minimum stability of 0.1 days
  }

  /**
   * Calculate the optimal interval based on desired retention
   * I(R, S) = S / FACTOR * (R^(1/DECAY) - 1)
   */
  private calculateInterval(stability: number, requestRetention?: number): number {
    const retention = requestRetention ?? this.parameters.requestRetention;
    const factor = Math.log(0.9);
    // I = S * ln(R) / ln(0.9)
    const interval = stability * Math.log(retention) / factor;

    // Apply maximum interval constraint
    return Math.min(
      Math.max(1, Math.round(interval)),
      this.parameters.maximumInterval
    );
  }

  /**
   * Apply fuzzing to interval for better distribution
   */
  private applyFuzz(interval: number): number {
    if (!this.parameters.enableFuzz || interval < 2.5) {
      return Math.round(interval);
    }

    // Fuzz range: smaller intervals get less fuzz
    const fuzzFactor = Math.min(1, interval / 100);
    const fuzzRange = interval * 0.05 * fuzzFactor;
    const fuzz = (Math.random() - 0.5) * 2 * fuzzRange;

    return Math.max(1, Math.round(interval + fuzz));
  }

  /**
   * Format interval as human-readable text
   */
  formatInterval(days: number): string {
    if (days < 1) {
      const minutes = Math.round(days * 24 * 60);
      if (minutes < 60) {
        return `${minutes}m`;
      }
      const hours = Math.round(minutes / 60);
      return `${hours}h`;
    }
    if (days < 30) {
      return `${Math.round(days)}d`;
    }
    if (days < 365) {
      const months = Math.round(days / 30);
      return `${months}mo`;
    }
    const years = (days / 365).toFixed(1);
    return `${years}y`;
  }

  /**
   * Get scheduling options for all ratings
   */
  getSchedulingCards(cardState: FSRSCardState, now?: number): SchedulingCards {
    const currentTime = now ?? Date.now();

    const createSchedulingInfo = (rating: Rating): SchedulingInfo => {
      const newState = this.processReview(cardState, rating, currentTime);
      return {
        rating,
        newState,
        interval: newState.scheduledDays,
        intervalText: this.formatInterval(newState.scheduledDays),
      };
    };

    return {
      again: createSchedulingInfo(RATING.AGAIN),
      hard: createSchedulingInfo(RATING.HARD),
      good: createSchedulingInfo(RATING.GOOD),
      easy: createSchedulingInfo(RATING.EASY),
    };
  }

  /**
   * Process a review and return the new card state
   * Main scheduling algorithm
   */
  processReview(
    cardState: FSRSCardState,
    rating: Rating,
    now?: number
  ): FSRSCardState {
    const currentTime = now ?? Date.now();
    const elapsedDays = cardState.lastReview
      ? (currentTime - cardState.lastReview) / (1000 * 60 * 60 * 24)
      : 0;

    // Copy state
    const newState: FSRSCardState = { ...cardState };
    newState.elapsedDays = elapsedDays;
    newState.lastReview = currentTime;

    // Handle based on current state
    switch (cardState.state) {
      case 'new':
        return this.processNewCard(newState, rating, currentTime);

      case 'learning':
      case 'relearning':
        return this.processLearningCard(newState, rating, currentTime);

      case 'review':
        return this.processReviewCard(newState, rating, currentTime, elapsedDays);

      default:
        return newState;
    }
  }

  /**
   * Process a new card
   */
  private processNewCard(
    state: FSRSCardState,
    rating: Rating,
    now: number
  ): FSRSCardState {
    state.difficulty = this.initDifficulty(rating);
    state.stability = this.initStability(rating);
    state.reps = 1;

    if (rating === RATING.AGAIN) {
      // Stay in learning with first step
      state.state = 'learning';
      state.scheduledDays = this.config.learningSteps[0] / (24 * 60);
    } else if (rating === RATING.HARD) {
      // Learning with second step or first if only one
      state.state = 'learning';
      const stepIndex = Math.min(1, this.config.learningSteps.length - 1);
      state.scheduledDays = this.config.learningSteps[stepIndex] / (24 * 60);
    } else if (rating === RATING.GOOD) {
      // Graduate to review
      state.state = 'review';
      state.scheduledDays = this.config.graduatingInterval;
    } else {
      // Easy - graduate with bonus interval
      state.state = 'review';
      state.scheduledDays = this.config.easyInterval;
    }

    state.scheduledDays = this.applyFuzz(state.scheduledDays);
    state.nextReview = now + state.scheduledDays * 24 * 60 * 60 * 1000;
    state.retrievability = this.calculateRetrievability(0, state.stability);

    return state;
  }

  /**
   * Process a card in learning/relearning state
   */
  private processLearningCard(
    state: FSRSCardState,
    rating: Rating,
    now: number
  ): FSRSCardState {
    const steps = state.state === 'learning'
      ? this.config.learningSteps
      : this.config.relearningSteps;

    if (rating === RATING.AGAIN) {
      // Reset to first step
      state.scheduledDays = steps[0] / (24 * 60);
      state.lapses = state.state === 'relearning' ? state.lapses : state.lapses;
    } else if (rating === RATING.HARD) {
      // Stay at current step or advance slightly
      const currentStep = steps[0];
      state.scheduledDays = (currentStep * 1.2) / (24 * 60);
    } else if (rating === RATING.GOOD) {
      // Graduate to review
      state.state = 'review';
      state.reps += 1;
      state.difficulty = this.nextDifficulty(state.difficulty, rating);
      state.scheduledDays = this.config.graduatingInterval;
    } else {
      // Easy - graduate with bonus
      state.state = 'review';
      state.reps += 1;
      state.difficulty = this.nextDifficulty(state.difficulty, rating);
      state.scheduledDays = this.config.easyInterval;
    }

    state.scheduledDays = this.applyFuzz(state.scheduledDays);
    state.nextReview = now + state.scheduledDays * 24 * 60 * 60 * 1000;
    state.retrievability = this.calculateRetrievability(0, state.stability);

    return state;
  }

  /**
   * Process a card in review state
   */
  private processReviewCard(
    state: FSRSCardState,
    rating: Rating,
    now: number,
    elapsedDays: number
  ): FSRSCardState {
    const retrievability = this.calculateRetrievability(elapsedDays, state.stability);
    state.retrievability = retrievability;

    if (rating === RATING.AGAIN) {
      // Failed - lapse
      state.lapses += 1;
      state.state = 'relearning';
      state.stability = this.nextStabilityAfterFailure(
        state.difficulty,
        state.stability,
        retrievability
      );
      state.difficulty = this.nextDifficulty(state.difficulty, rating);
      state.scheduledDays = this.config.relearningSteps[0] / (24 * 60);
    } else {
      // Success
      state.reps += 1;
      state.stability = this.nextStabilityAfterSuccess(
        state.difficulty,
        state.stability,
        retrievability,
        rating
      );
      state.difficulty = this.nextDifficulty(state.difficulty, rating);
      state.scheduledDays = this.calculateInterval(state.stability);
    }

    state.scheduledDays = this.applyFuzz(state.scheduledDays);
    state.nextReview = now + state.scheduledDays * 24 * 60 * 60 * 1000;

    return state;
  }

  /**
   * Create a review log entry
   */
  createReviewLog(
    cardId: string,
    cardState: FSRSCardState,
    newState: FSRSCardState,
    rating: Rating,
    reviewDuration: number
  ): ReviewLog {
    return {
      cardId,
      timestamp: Date.now(),
      rating,
      stateBefore: cardState.state,
      stateAfter: newState.state,
      scheduledDays: newState.scheduledDays,
      elapsedDays: newState.elapsedDays,
      reviewDuration,
    };
  }

  /**
   * Get cards due for review
   */
  getDueCards(cards: LearningCard[], now?: number): LearningCard[] {
    const currentTime = now ?? Date.now();
    return cards
      .filter(card => card.fsrsState.nextReview <= currentTime)
      .sort((a, b) => {
        // Priority: learning/relearning first, then by due date
        const priorityA = a.fsrsState.state === 'new' ? 2
          : ['learning', 'relearning'].includes(a.fsrsState.state) ? 0 : 1;
        const priorityB = b.fsrsState.state === 'new' ? 2
          : ['learning', 'relearning'].includes(b.fsrsState.state) ? 0 : 1;

        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.fsrsState.nextReview - b.fsrsState.nextReview;
      });
  }

  /**
   * Get new cards (never reviewed)
   */
  getNewCards(cards: LearningCard[]): LearningCard[] {
    return cards
      .filter(card => card.fsrsState.state === 'new')
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Build a study queue for a session
   */
  buildStudyQueue(
    cards: LearningCard[],
    now?: number
  ): ReviewQueueItem[] {
    const currentTime = now ?? Date.now();
    const queue: ReviewQueueItem[] = [];

    // Get due reviews
    const dueCards = this.getDueCards(cards, currentTime);
    const reviewCards = dueCards
      .filter(c => c.fsrsState.state === 'review')
      .slice(0, this.config.maxReviewsPerDay || undefined);

    // Get learning/relearning cards (no limit)
    const learningCards = dueCards
      .filter(c => ['learning', 'relearning'].includes(c.fsrsState.state));

    // Get new cards
    const newCards = this.getNewCards(cards)
      .slice(0, this.config.newCardsPerDay);

    // Add learning cards first (highest priority)
    let priority = 0;
    for (const card of learningCards) {
      queue.push({
        cardId: card.id,
        dueDate: card.fsrsState.nextReview,
        state: card.fsrsState.state,
        priority: priority++,
      });
    }

    // Interleave reviews and new cards
    const reviewQueue = [...reviewCards];
    const newQueue = [...newCards];

    while (reviewQueue.length > 0 || newQueue.length > 0) {
      // Add a batch of reviews (e.g., 10)
      const reviewBatch = reviewQueue.splice(0, 10);
      for (const card of reviewBatch) {
        queue.push({
          cardId: card.id,
          dueDate: card.fsrsState.nextReview,
          state: card.fsrsState.state,
          priority: priority++,
        });
      }

      // Add a new card
      if (newQueue.length > 0) {
        const newCard = newQueue.shift()!;
        queue.push({
          cardId: newCard.id,
          dueDate: newCard.fsrsState.nextReview,
          state: newCard.fsrsState.state,
          priority: priority++,
        });
      }
    }

    return queue;
  }

  /**
   * Create a new study session
   */
  createStudySession(cards: LearningCard[]): StudySession {
    const queue = this.buildStudyQueue(cards);

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      queue,
      currentIndex: 0,
      reviewedCount: 0,
      newLearnedCount: 0,
      failedCount: 0,
      isActive: true,
    };
  }

  /**
   * Calculate daily statistics
   */
  calculateDailyStats(
    reviewLogs: ReviewLog[],
    date: string
  ): DailyStats {
    const dayStart = new Date(date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const todayLogs = reviewLogs.filter(
      log => log.timestamp >= dayStart && log.timestamp < dayEnd
    );

    const reviewed = todayLogs.length;
    const newLearned = todayLogs.filter(log => log.stateBefore === 'new').length;
    const failed = todayLogs.filter(log => log.rating === RATING.AGAIN).length;
    const totalTime = todayLogs.reduce((sum, log) => sum + log.reviewDuration, 0);

    const successfulReviews = todayLogs.filter(log => log.rating >= RATING.HARD).length;
    const averageAccuracy = reviewed > 0 ? successfulReviews / reviewed : 0;

    return {
      date,
      reviewed,
      newLearned,
      failed,
      totalTime,
      averageAccuracy,
      cardsSkipped: 0, // Would need to be calculated from card data
    };
  }

  /**
   * Calculate overall learning statistics
   */
  calculateLearningStats(
    cards: LearningCard[],
    reviewLogs: ReviewLog[],
    dailyStats: DailyStats[]
  ): LearningStats {
    const activeCards = cards;
    const now = Date.now();

    const byState: Record<CardState, number> = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
    };

    let dueCards = 0;
    let overdueCards = 0;

    for (const card of activeCards) {
      byState[card.fsrsState.state]++;

      if (card.fsrsState.nextReview <= now) {
        dueCards++;
        // Overdue if more than 1 day past due
        if (now - card.fsrsState.nextReview > 24 * 60 * 60 * 1000) {
          overdueCards++;
        }
      }
    }

    // Calculate retention rate from recent reviews
    const recentLogs = reviewLogs.filter(
      log => now - log.timestamp < 30 * 24 * 60 * 60 * 1000
    );
    const retentionRate = recentLogs.length > 0
      ? recentLogs.filter(log => log.rating >= RATING.HARD).length / recentLogs.length
      : 0;

    // Calculate streak
    let streak = 0;
    let bestStreak = 0;
    let currentStreak = 0;

    const sortedStats = [...dailyStats].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const stat of sortedStats) {
      if (stat.reviewed > 0) {
        currentStreak++;
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    streak = currentStreak;

    // Average daily reviews
    const last30Days = dailyStats.filter(
      s => now - new Date(s.date).getTime() < 30 * 24 * 60 * 60 * 1000
    );
    const averageDailyReviews = last30Days.length > 0
      ? last30Days.reduce((sum, s) => sum + s.reviewed, 0) / last30Days.length
      : 0;

    // Predicted retention (weighted average of card retrievabilities)
    const reviewCards = activeCards.filter(c => c.fsrsState.state === 'review');
    const predictedRetention = reviewCards.length > 0
      ? reviewCards.reduce((sum, c) => {
          const elapsed = (now - (c.fsrsState.lastReview || now)) / (1000 * 60 * 60 * 24);
          return sum + this.calculateRetrievability(elapsed, c.fsrsState.stability);
        }, 0) / reviewCards.length
      : 0;

    return {
      totalCards: activeCards.length,
      byState,
      dueCards,
      overdueCards,
      retentionRate,
      totalReviews: reviewLogs.length,
      streak,
      bestStreak,
      averageDailyReviews,
      predictedRetention,
    };
  }

  /**
   * Predict future workload
   */
  predictWorkload(
    cards: LearningCard[],
    daysAhead: number = 7
  ): Map<string, number> {
    const workload = new Map<string, number>();
    const now = Date.now();

    for (let i = 0; i < daysAhead; i++) {
      const dayStart = now + i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const date = new Date(dayStart).toISOString().split('T')[0];

      const dueCount = cards.filter(card => {
        const nextReview = card.fsrsState.nextReview;
        return nextReview >= dayStart && nextReview < dayEnd;
      }).length;

      workload.set(date, dueCount);
    }

    return workload;
  }
}

/**
 * Singleton instance
 */
let fsrsServiceInstance: FSRSService | null = null;

export function getFSRSService(
  parameters?: Partial<FSRSParameters>,
  config?: Partial<StudySessionConfig>
): FSRSService {
  if (!fsrsServiceInstance) {
    fsrsServiceInstance = new FSRSService(parameters, config);
  }
  return fsrsServiceInstance;
}

export function resetFSRSService(): void {
  fsrsServiceInstance = null;
}
