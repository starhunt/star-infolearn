/**
 * AI Service Types and Interfaces (Simplified)
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
