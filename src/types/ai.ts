/**
 * AI Service Types and Interfaces
 */

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'zhipu';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIServiceConfig {
  defaultProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TextExtractionResult {
  text: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface KeywordIdentificationResult {
  keyword: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  importance: number; // 0-1
}

export interface BlankingData {
  fileId: string;
  fileName: string;
  blanks: KeywordIdentificationResult[];
  createdAt: number;
  updatedAt: number;
}

export interface RewritingOptions {
  style: 'summary' | 'detailed' | 'beginner' | 'expert' | 'story' | 'report';
  language?: string;
  maxLength?: number;
}

export interface AssociationLink {
  id: string;
  sourceFile: string;
  sourceBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  targetNote: string;
  targetBlock?: string;
  createdAt: number;
}

export interface MockAIResponse {
  keywords?: KeywordIdentificationResult[];
  rewrittenContent?: string;
  summary?: string;
}
