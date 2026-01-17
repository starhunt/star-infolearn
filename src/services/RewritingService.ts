/**
 * Rewriting Service - Handles content rewriting functionality
 */

import { AIService } from './AIService';
import { RewritingStyle, RewritingConfig, RewritingResult } from '../types/rewriting';

export class RewritingService {
  private aiService: AIService;
  private config: RewritingConfig;

  constructor(aiService: AIService, config?: Partial<RewritingConfig>) {
    this.aiService = aiService;
    this.config = {
      maxLength: undefined,
      language: 'en',
      includeKeywords: true,
      preserveStructure: true,
      ...config,
    };
  }

  /**
   * Rewrite content in different styles
   */
  async rewriteContent(text: string, style: RewritingStyle): Promise<string> {
    try {
      const result = await this.aiService.rewriteContent(text, {
        style,
        maxLength: this.config.maxLength,
        language: this.config.language,
      });

      return result;
    } catch (error) {
      console.error('Error rewriting content:', error);
      return this.getMockRewriteContent(text, style);
    }
  }

  /**
   * Rewrite content in all styles
   */
  async rewriteAllStyles(text: string): Promise<Record<RewritingStyle, string>> {
    const styles: RewritingStyle[] = ['summary', 'detailed', 'beginner', 'expert', 'story', 'report'];

    const results: Record<RewritingStyle, string> = {} as any;

    for (const style of styles) {
      results[style] = await this.rewriteContent(text, style);
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  /**
   * Calculate readability score (simplified)
   */
  calculateReadabilityScore(text: string): number {
    // Simple readability calculation
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;

    // Score based on average words per sentence
    // Ideal is 15-20 words per sentence
    let score = 100;
    if (avgWordsPerSentence < 10) score -= 10;
    if (avgWordsPerSentence > 25) score -= 20;
    if (avgWordsPerSentence > 35) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string): string[] {
    // Simple keyword extraction (in real implementation would use NLP)
    const words = text.toLowerCase().split(/\s+/);
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where',
      'why', 'how',
    ]);

    const keywords = words
      .filter(word => word.length > 3 && !stopwords.has(word))
      .slice(0, 10);

    return [...new Set(keywords)];
  }

  /**
   * Calculate results
   */
  calculateResults(
    originalText: string,
    rewrittenText: string,
    style: RewritingStyle
  ): RewritingResult {
    const keywords = this.extractKeywords(originalText);
    const keywordsPreserved = keywords.filter(keyword =>
      rewrittenText.toLowerCase().includes(keyword)
    );

    return {
      originalLength: originalText.length,
      rewrittenLength: rewrittenText.length,
      style,
      readabilityScore: this.calculateReadabilityScore(rewrittenText),
      keywordsPreserved,
    };
  }

  /**
   * Get mock rewrite content
   */
  private getMockRewriteContent(text: string, style: RewritingStyle): string {
    const mockResponses: Record<RewritingStyle, string> = {
      summary: `Summary: ${text.substring(0, 100)}...`,
      detailed: `Detailed explanation: ${text} This provides comprehensive coverage of all aspects.`,
      beginner: `Think of it simply: ${text} Imagine this as building blocks...`,
      expert: `Advanced analysis: ${text} From a sophisticated perspective, this demonstrates...`,
      story: `Once upon a time, there was a concept. ${text} And that's how it all came together...`,
      report: `Executive Summary: ${text} Key Findings: [Analysis]. Recommendations: [Actions].`,
    };

    return mockResponses[style];
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<RewritingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): RewritingConfig {
    return this.config;
  }

  /**
   * Get rewriting options
   */
  getRewritingOptions() {
    return [
      {
        id: 'summary' as RewritingStyle,
        label: 'Summary',
        description: 'Concise 2-3 sentence summary',
        icon: '📋',
      },
      {
        id: 'detailed' as RewritingStyle,
        label: 'Detailed',
        description: 'Comprehensive explanation with examples',
        icon: '📚',
      },
      {
        id: 'beginner' as RewritingStyle,
        label: 'Beginner',
        description: 'Simple terms for beginners',
        icon: '🌱',
      },
      {
        id: 'expert' as RewritingStyle,
        label: 'Expert',
        description: 'Advanced analysis and insights',
        icon: '🎓',
      },
      {
        id: 'story' as RewritingStyle,
        label: 'Story',
        description: 'Engaging narrative format',
        icon: '📖',
      },
      {
        id: 'report' as RewritingStyle,
        label: 'Report',
        description: 'Professional business format',
        icon: '📊',
      },
    ];
  }
}
