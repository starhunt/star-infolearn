/**
 * Blanking Service - Handles fill-in-the-blank functionality
 */

import { AIService } from './AIService';
import { TextExtractorService } from './TextExtractorService';
import { BlankItem, BlankingConfig, BlankingResult } from '../types/blanking';
import { KeywordIdentificationResult } from '../types/ai';

export class BlankingService {
  private aiService: AIService;
  private textExtractorService: TextExtractorService;
  private config: BlankingConfig;
  private startTime: number = 0;

  constructor(aiService: AIService, textExtractorService: TextExtractorService, config?: Partial<BlankingConfig>) {
    this.aiService = aiService;
    this.textExtractorService = textExtractorService;
    this.config = {
      autoGenerate: true,
      numberOfBlanks: 5,
      showHints: true,
      caseSensitive: false,
      allowPartialMatch: true,
      highlightColor: '#FFFF00',
      ...config,
    };
  }

  /**
   * Generate blanks from file
   */
  async generateBlanks(file: File, customCount?: number): Promise<BlankItem[]> {
    this.startTime = Date.now();

    try {
      // Extract text from file
      const textResults = await this.textExtractorService.extractTextFromFile(file);

      // Get full text for AI analysis
      const fullText = textResults.map(r => r.text).join(' ');

      // Identify keywords using AI
      const numberOfBlanks = customCount || this.config.numberOfBlanks;
      const keywords = await this.aiService.identifyKeywords(fullText, textResults.map(r => r.bounds));

      // Limit to configured number
      const limitedKeywords = keywords.slice(0, numberOfBlanks);

      // Convert to BlankItems
      return limitedKeywords.map((kw, index) => ({
        id: `blank-${Date.now()}-${index}`,
        keyword: kw.keyword,
        bounds: kw.bounds,
        importance: kw.importance,
        isAnswered: false,
      }));
    } catch (error) {
      console.error('Error generating blanks:', error);
      return this.getMockBlanks();
    }
  }

  /**
   * Check answer
   */
  checkAnswer(blankKeyword: string, userAnswer: string): boolean {
    let answer = userAnswer.trim();
    let keyword = blankKeyword.trim();

    if (!this.config.caseSensitive) {
      answer = answer.toLowerCase();
      keyword = keyword.toLowerCase();
    }

    if (this.config.allowPartialMatch) {
      // Check if answer contains keyword or keyword contains answer
      return answer.includes(keyword) || keyword.includes(answer);
    } else {
      // Exact match
      return answer === keyword;
    }
  }

  /**
   * Calculate results
   */
  calculateResults(
    totalBlanks: number,
    correctAnswers: number,
    incorrectAnswers: number,
    unansweredBlanks: number
  ): BlankingResult {
    const accuracy = totalBlanks > 0 ? (correctAnswers / totalBlanks) * 100 : 0;
    const timeSpent = Date.now() - this.startTime;

    return {
      totalBlanks,
      correctAnswers,
      incorrectAnswers,
      unansweredBlanks,
      accuracy,
      timeSpent,
    };
  }

  /**
   * Get hint for blank
   */
  getHint(keyword: string): string {
    if (!this.config.showHints) {
      return 'Hints are disabled';
    }

    const hints: Record<string, string> = {
      learning: 'The process of acquiring knowledge or skills',
      infographic: 'A visual representation of data or information',
      analysis: 'Detailed examination of something',
      interactive: 'Allowing two-way communication or action',
      knowledge: 'Information and skills acquired through experience or education',
      retention: 'The ability to keep or remember something',
      engagement: 'The degree of involvement or interest',
      comprehension: 'The ability to understand something',
    };

    return hints[keyword.toLowerCase()] || `Think about: ${keyword}`;
  }

  /**
   * Get mock blanks for testing
   */
  private getMockBlanks(): BlankItem[] {
    const mockKeywords = ['learning', 'infographic', 'analysis', 'interactive', 'knowledge'];
    return mockKeywords.map((keyword, index) => ({
      id: `blank-mock-${index}`,
      keyword,
      bounds: {
        x: 10 + index * 100,
        y: 50,
        width: 80,
        height: 30,
      },
      importance: 0.7 + Math.random() * 0.3,
      isAnswered: false,
    }));
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<BlankingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): BlankingConfig {
    return this.config;
  }
}
