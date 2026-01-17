/**
 * Rewriting Feature Types
 */

export type RewritingStyle = 'summary' | 'detailed' | 'beginner' | 'expert' | 'story' | 'report';

export interface RewritingState {
  isActive: boolean;
  originalText: string;
  rewrittenVersions: Record<RewritingStyle, string>;
  selectedStyle: RewritingStyle | null;
  isLoading: boolean;
}

export interface RewritingOption {
  id: RewritingStyle;
  label: string;
  description: string;
  icon: string;
}

export interface RewritingConfig {
  maxLength?: number;
  language?: string;
  includeKeywords: boolean;
  preserveStructure: boolean;
}

export interface RewritingResult {
  originalLength: number;
  rewrittenLength: number;
  style: RewritingStyle;
  readabilityScore?: number;
  keywordsPreserved?: string[];
}
