/**
 * QuestionGeneratorService (Simplified)
 * Generates flashcards from text using AI
 */

import { AIService } from './AIService';
import {
  LearningCard,
  LearningCardType,
  createLearningCard,
  QuestionGenerationRequest,
  QuestionGenerationResult,
  MCQOption,
} from '../types/learning';

/**
 * Question generation options
 */
export interface GenerationOptions {
  /** Question types to generate */
  types: LearningCardType[];
  /** Number of questions per type */
  countPerType: number;
  /** Target difficulty (1-5) */
  difficulty?: number;
  /** Language for questions */
  language?: string;
  /** Additional context */
  context?: string;
}

/**
 * QuestionGeneratorService
 */
export class QuestionGeneratorService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * Generate questions from text content
   */
  async generateFromText(
    text: string,
    sourceFile: string,
    options: GenerationOptions
  ): Promise<QuestionGenerationResult> {
    const request: QuestionGenerationRequest = {
      content: text,
      questionTypes: options.types,
      countPerType: options.countPerType,
      targetDifficulty: options.difficulty || 3,
      language: options.language,
      context: options.context,
    };

    const result = await this.aiService.generateQuestions(request);

    // Set source file on all generated cards
    result.cards = result.cards.map((card) => ({
      ...card,
      sourceFile,
      sourceText: text.slice(0, 200),
    }));

    return result;
  }

  /**
   * Generate fill-in-the-blank cards
   */
  async generateFillBlanks(
    text: string,
    sourceFile: string,
    count: number = 5
  ): Promise<LearningCard[]> {
    const result = await this.generateFromText(text, sourceFile, {
      types: ['fill_blank'],
      countPerType: count,
    });

    return result.cards;
  }

  /**
   * Generate multiple choice cards
   */
  async generateMCQ(
    text: string,
    sourceFile: string,
    count: number = 5
  ): Promise<LearningCard[]> {
    const result = await this.generateFromText(text, sourceFile, {
      types: ['multiple_choice'],
      countPerType: count,
    });

    return result.cards;
  }

  /**
   * Generate flashcard cards
   */
  async generateFlashcards(
    text: string,
    sourceFile: string,
    count: number = 5
  ): Promise<LearningCard[]> {
    const result = await this.generateFromText(text, sourceFile, {
      types: ['flashcard'],
      countPerType: count,
    });

    return result.cards;
  }

  /**
   * Generate a balanced mix of question types
   */
  async generateMixedQuestions(
    text: string,
    sourceFile: string,
    totalCount: number = 10,
    options?: Partial<GenerationOptions>
  ): Promise<QuestionGenerationResult> {
    const defaultTypes: LearningCardType[] = [
      'flashcard',
      'fill_blank',
      'multiple_choice',
      'short_answer',
    ];

    const types = options?.types || defaultTypes;
    const countPerType = Math.max(1, Math.ceil(totalCount / types.length));

    return this.generateFromText(text, sourceFile, {
      types,
      countPerType,
      ...options,
    });
  }

  /**
   * Validate generated cards for quality
   */
  validateCards(cards: LearningCard[]): {
    valid: LearningCard[];
    invalid: Array<{ card: LearningCard; issues: string[] }>;
  } {
    const valid: LearningCard[] = [];
    const invalid: Array<{ card: LearningCard; issues: string[] }> = [];

    for (const card of cards) {
      const issues: string[] = [];

      // Check front content
      if (!card.front || card.front.trim().length < 5) {
        issues.push('Front content is too short or empty');
      }

      // Check back content
      if (!card.back || card.back.trim().length < 2) {
        issues.push('Back content is too short or empty');
      }

      // Check for identical front/back
      if (card.front === card.back) {
        issues.push('Front and back content are identical');
      }

      // Check MCQ options
      if (card.type === 'multiple_choice') {
        if (!card.options || card.options.length < 2) {
          issues.push('Multiple choice card missing options');
        } else if (!card.options.some((o) => o.isCorrect)) {
          issues.push('Multiple choice card has no correct answer');
        }
      }

      if (issues.length === 0) {
        valid.push(card);
      } else {
        invalid.push({ card, issues });
      }
    }

    return { valid, invalid };
  }

  /**
   * Deduplicate similar cards
   */
  deduplicateCards(cards: LearningCard[]): LearningCard[] {
    const seen = new Set<string>();
    const unique: LearningCard[] = [];

    for (const card of cards) {
      const hash = this.hashCardContent(card);

      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(card);
      }
    }

    return unique;
  }

  /**
   * Create a hash of card content for deduplication
   */
  private hashCardContent(card: LearningCard): string {
    const content = `${card.front}|${card.back}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

/**
 * Factory function
 */
export function createQuestionGeneratorService(
  aiService: AIService
): QuestionGeneratorService {
  return new QuestionGeneratorService(aiService);
}
