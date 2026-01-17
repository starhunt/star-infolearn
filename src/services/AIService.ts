/**
 * AI Service - Handles communication with multiple AI providers
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIProviderConfig, AIResponse, AIServiceConfig, KeywordIdentificationResult, RewritingOptions } from '../types/ai';
import { AIServiceError, ProviderNotConfiguredError, ApiKeyNotSetError, RateLimitError, isAxiosError } from '../types/errors';

export class AIService {
  private config: AIServiceConfig;
  private currentProvider: AIProvider;
  private axiosInstances: Record<AIProvider, AxiosInstance> = {} as any;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.currentProvider = config.defaultProvider;
    this.initializeAxiosInstances();
  }

  /**
   * Initialize Axios instances for each provider
   */
  private initializeAxiosInstances(): void {
    const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'];
    
    providers.forEach(provider => {
      const providerConfig = this.config.providers[provider];
      if (providerConfig && providerConfig.apiKey) {
        this.axiosInstances[provider] = this.createAxiosInstance(provider, providerConfig);
      }
    });
  }

  /**
   * Create Axios instance for specific provider
   */
  private createAxiosInstance(provider: AIProvider, config: AIProviderConfig): AxiosInstance {
    const baseURL = config.baseUrl || this.getDefaultBaseURL(provider);
    
    return axios.create({
      baseURL,
      timeout: 30000,
      headers: this.getHeaders(provider, config),
    });
  }

  /**
   * Get default base URL for provider
   */
  private getDefaultBaseURL(provider: AIProvider): string {
    const urls: Record<AIProvider, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
      grok: 'https://api.x.ai/v1',
      zhipu: 'https://api.z.ai/api/coding/paas/v4',
    };
    return urls[provider];
  }

  /**
   * Get headers for provider
   */
  private getHeaders(provider: AIProvider, config: AIProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'openai':
      case 'grok':
      case 'gemini':
      case 'zhipu':
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        break;
      case 'anthropic':
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
    }

    return headers;
  }

  /**
   * Set the current AI provider
   */
  setProvider(provider: AIProvider): void {
    if (!this.config.providers[provider]) {
      throw new ProviderNotConfiguredError(provider);
    }
    if (!this.config.providers[provider].apiKey) {
      throw new ApiKeyNotSetError(provider);
    }
    this.currentProvider = provider;
  }

  /**
   * Get current provider
   */
  getProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(provider: AIProvider): Promise<boolean> {
    try {
      const config = this.config.providers[provider];
      if (!config || !config.apiKey) {
        return false;
      }

      // Create temporary axios instance for testing
      const testInstance = this.createAxiosInstance(provider, config);
      
      // Send test request based on provider
      const testPrompt = 'Say "OK" only.';
      
      switch (provider) {
        case 'openai':
        case 'grok':
          await testInstance.post('/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10,
          });
          break;
          
        case 'anthropic':
          await testInstance.post('/messages', {
            model: config.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: testPrompt }],
          });
          break;
          
        case 'gemini':
          await testInstance.post('/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10,
          });
          break;
          
        case 'zhipu':
          await testInstance.post('/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10,
          });
          break;
      }

      return true;
    } catch (error) {
      console.error(`Connection test failed for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Identify keywords from text (for Blanking feature)
   */
  async identifyKeywords(text: string, bounds: { x: number; y: number; width: number; height: number }[]): Promise<KeywordIdentificationResult[]> {
    const config = this.config.providers[this.currentProvider];
    if (!config) {
      throw new ProviderNotConfiguredError(this.currentProvider);
    }

    const prompt = `Analyze the following text and identify 5-10 key learning keywords that would be good for a fill-in-the-blank exercise. Return a JSON array with objects containing: keyword, importance (0-1).

Text: "${text}"

Return ONLY valid JSON array, no markdown formatting, no code blocks.`;

    try {
      const response = await this.callAI(prompt);
      const keywords = JSON.parse(response);

      // Map keywords to bounds
      return keywords.map((kw: { keyword: string; importance?: number }, index: number) => ({
        keyword: kw.keyword,
        bounds: bounds[index % bounds.length],
        importance: kw.importance || 0.5,
      }));
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw AIServiceError.fromAxiosError(this.currentProvider, error);
    }
  }

  /**
   * Rewrite content based on style
   */
  async rewriteContent(text: string, options: RewritingOptions): Promise<string> {
    const config = this.config.providers[this.currentProvider];
    if (!config) {
      throw new ProviderNotConfiguredError(this.currentProvider);
    }

    const stylePrompts: Record<string, string> = {
      summary: 'Provide a concise 2-3 sentence summary of the following content.',
      detailed: 'Provide a detailed explanation of the following content with examples.',
      beginner: 'Explain the following content in simple terms that a beginner can understand.',
      expert: 'Provide an expert-level analysis of the following content.',
      story: 'Rewrite the following content as an engaging story.',
      report: 'Rewrite the following content as a professional business report.',
    };

    const prompt = `${stylePrompts[options.style] || stylePrompts.summary}

Content: "${text}"

${options.maxLength ? `Keep the response under ${options.maxLength} characters.` : ''}`;

    try {
      return await this.callAI(prompt);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw AIServiceError.fromAxiosError(this.currentProvider, error);
    }
  }

  /**
   * Call AI provider
   */
  private async callAI(prompt: string): Promise<string> {
    const config = this.config.providers[this.currentProvider];
    if (!config) {
      throw new ProviderNotConfiguredError(this.currentProvider);
    }

    try {
      switch (this.currentProvider) {
        case 'openai':
        case 'grok':
          return await this.callOpenAI(config, prompt);
        case 'anthropic':
          return await this.callAnthropic(config, prompt);
        case 'gemini':
          return await this.callGemini(config, prompt);
        case 'zhipu':
          return await this.callZhipu(config, prompt);
        default:
          throw new AIServiceError(
            `Unknown provider: ${this.currentProvider}`,
            this.currentProvider
          );
      }
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Check for rate limit error
      if (isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = parseInt(error.response?.data?.retry_after || '60', 10);
        throw new RateLimitError(this.currentProvider, retryAfter);
      }

      throw AIServiceError.fromAxiosError(this.currentProvider, error);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('OpenAI instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('Anthropic instance not initialized');
    }

    const response = await instance.post('/messages', {
      model: config.model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.data.content[0].text;
  }

  /**
   * Call Google Gemini API (OpenAI-compatible endpoint)
   */
  private async callGemini(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances['gemini'];
    if (!instance) {
      throw new Error('Gemini instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Call Zhipu GLM API (코딩플랜 엔드포인트)
   */
  private async callZhipu(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('Zhipu instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(provider: AIProvider, config: Partial<AIProviderConfig>): void {
    if (!this.config.providers[provider]) {
      this.config.providers[provider] = {
        provider,
        apiKey: '',
        model: '',
        ...config,
      };
    } else {
      this.config.providers[provider] = {
        ...this.config.providers[provider],
        ...config,
      };
    }
    
    // Reinitialize axios instance for this provider
    if (this.config.providers[provider].apiKey) {
      this.axiosInstances[provider] = this.createAxiosInstance(provider, this.config.providers[provider]);
    }
  }

  /**
   * Get all provider configs
   */
  getAllProviderConfigs(): Record<AIProvider, AIProviderConfig> {
    return this.config.providers;
  }

  /**
   * Get provider config
   */
  getProviderConfig(provider: AIProvider): AIProviderConfig | undefined {
    return this.config.providers[provider];
  }

  /**
   * Update default provider
   */
  setDefaultProvider(provider: AIProvider): void {
    this.config.defaultProvider = provider;
    this.currentProvider = provider;
  }

  /**
   * Get default provider
   */
  getDefaultProvider(): AIProvider {
    return this.config.defaultProvider;
  }
}
