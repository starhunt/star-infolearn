/**
 * AI Service - Handles communication with multiple AI providers (Simplified)
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIProviderConfig, AIServiceConfig } from '../types/ai';
import { AIServiceError, ProviderNotConfiguredError, ApiKeyNotSetError, RateLimitError, isAxiosError } from '../types/errors';
import { LearningCard, LearningCardType, createLearningCard, QuestionGenerationRequest, QuestionGenerationResult, AnswerEvaluation } from '../types/learning';

export class AIService {
  private config: AIServiceConfig;
  private currentProvider: AIProvider;
  private axiosInstances: Record<AIProvider, AxiosInstance> = {} as any;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.currentProvider = config.defaultProvider;
    this.initializeAxiosInstances();
  }

  private initializeAxiosInstances(): void {
    const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'grok', 'zhipu'];

    providers.forEach(provider => {
      const providerConfig = this.config.providers[provider];
      if (providerConfig && providerConfig.apiKey) {
        this.axiosInstances[provider] = this.createAxiosInstance(provider, providerConfig);
      }
    });
  }

  private createAxiosInstance(provider: AIProvider, config: AIProviderConfig): AxiosInstance {
    const baseURL = config.baseUrl || this.getDefaultBaseURL(provider);

    return axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for batch generation requests
      headers: this.getHeaders(provider, config),
    });
  }

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

  setProvider(provider: AIProvider): void {
    if (!this.config.providers[provider]) {
      throw new ProviderNotConfiguredError(provider);
    }
    if (!this.config.providers[provider].apiKey) {
      throw new ApiKeyNotSetError(provider);
    }
    this.currentProvider = provider;
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }

  async testConnection(provider: AIProvider): Promise<boolean> {
    try {
      const config = this.config.providers[provider];
      if (!config || !config.apiKey) {
        return false;
      }

      const testInstance = this.createAxiosInstance(provider, config);
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

      if (isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = parseInt(error.response?.data?.retry_after || '60', 10);
        throw new RateLimitError(this.currentProvider, retryAfter);
      }

      throw AIServiceError.fromAxiosError(this.currentProvider, error);
    }
  }

  private async callOpenAI(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('OpenAI instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 16000,
    });

    return response.data.choices[0].message.content;
  }

  private async callAnthropic(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('Anthropic instance not initialized');
    }

    const response = await instance.post('/messages', {
      model: config.model,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.data.content[0].text;
  }

  private async callGemini(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances['gemini'];
    if (!instance) {
      throw new Error('Gemini instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 16000,
    });

    return response.data.choices[0].message.content;
  }

  private async callZhipu(config: AIProviderConfig, prompt: string): Promise<string> {
    const instance = this.axiosInstances[this.currentProvider];
    if (!instance) {
      throw new Error('Zhipu instance not initialized');
    }

    const response = await instance.post('/chat/completions', {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 16000,
    });

    return response.data.choices[0].message.content;
  }

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

    if (this.config.providers[provider].apiKey) {
      this.axiosInstances[provider] = this.createAxiosInstance(provider, this.config.providers[provider]);
    }
  }

  getAllProviderConfigs(): Record<AIProvider, AIProviderConfig> {
    return this.config.providers;
  }

  getProviderConfig(provider: AIProvider): AIProviderConfig | undefined {
    return this.config.providers[provider];
  }

  setDefaultProvider(provider: AIProvider): void {
    this.config.defaultProvider = provider;
    this.currentProvider = provider;
  }

  getDefaultProvider(): AIProvider {
    return this.config.defaultProvider;
  }

  /**
   * Generate learning questions from content
   */
  async generateQuestions(
    request: QuestionGenerationRequest
  ): Promise<QuestionGenerationResult> {
    const config = this.config.providers[this.currentProvider];
    if (!config) {
      throw new ProviderNotConfiguredError(this.currentProvider);
    }

    const questionTypePrompts = this.getQuestionTypePrompts(request.questionTypes);

    const prompt = `당신은 전문 교육 콘텐츠 제작자입니다. 다음 내용에서 학습용 플래시카드를 생성하세요.
모든 질문과 답변은 반드시 한국어로 작성해야 합니다.
${request.context ? `주제/맥락: ${request.context}` : ''}
${request.targetDifficulty ? `목표 난이도: ${request.targetDifficulty}/5` : ''}

분석할 내용:
"""
${request.content}
"""

다음 유형별로 각각 ${request.countPerType}개의 질문을 생성하세요:
${questionTypePrompts}

다음 구조의 JSON 객체를 반환하세요:
{
  "cards": [
    {
      "type": "flashcard" | "fill_blank" | "multiple_choice" | "short_answer",
      "front": "질문 텍스트 (한국어)",
      "back": "답변 텍스트 (한국어)",
      "hint": "선택적 힌트 (null 가능, 한국어)",
      "explanation": "정답인 이유 설명 (null 가능, 한국어)",
      "difficulty": 1-5,
      "options": [{"id": "a", "text": "선택지 텍스트 (한국어)", "isCorrect": true/false}]
    }
  ],
  "concepts": ["개념1", "개념2"],
  "confidence": 0.0-1.0
}

중요:
- 모든 텍스트(front, back, hint, explanation, options)는 반드시 한국어로 작성하세요
- "front"와 "back"은 반드시 문자열이어야 합니다 (객체 아님)
- "options" 배열은 multiple_choice 유형에만 필요합니다
- fill_blank의 경우, front 텍스트에서 빈칸은 "___"로 표시합니다
- 마크다운 포맷팅이나 코드 블록 없이 유효한 JSON만 반환하세요`;

    try {
      const response = await this.callAI(prompt);

      // Try to extract JSON from the response
      let jsonStr = response.trim();

      // Log raw response for debugging
      console.log('AI raw response length:', response.length);

      if (!jsonStr) {
        throw new AIServiceError('Empty response from AI', this.currentProvider);
      }

      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }

      // Try to find JSON object in response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parse error. Response:', jsonStr.slice(0, 500));
        throw new AIServiceError(
          `Invalid JSON response from AI. Response preview: ${jsonStr.slice(0, 200)}...`,
          this.currentProvider
        );
      }

      const cards: LearningCard[] = result.cards.map((cardData: Record<string, unknown>) => {
        // Handle both old format (object) and new format (string) for front/back
        const front = typeof cardData.front === 'object'
          ? (cardData.front as { content: string }).content
          : cardData.front as string;

        const back = typeof cardData.back === 'object'
          ? (cardData.back as { content: string }).content
          : cardData.back as string;

        return createLearningCard({
          type: cardData.type as LearningCardType,
          sourceFile: '',
          front,
          back,
          hint: cardData.hint as string | undefined,
          explanation: cardData.explanation as string | undefined,
          difficulty: (cardData.difficulty as 1 | 2 | 3 | 4 | 5) || 3,
          options: cardData.options as LearningCard['options'],
          tags: ['ai-generated'],
        });
      });

      return {
        cards,
        confidence: result.confidence || 0.8,
        concepts: result.concepts || [],
      };
    } catch (error) {
      console.error('Error generating questions:', error);
      throw AIServiceError.fromAxiosError(this.currentProvider, error);
    }
  }

  private getQuestionTypePrompts(types: LearningCardType[]): string {
    const typeDescriptions: Record<LearningCardType, string> = {
      flashcard: '플래시카드: 간단한 Q&A 카드를 만드세요. front는 질문, back은 답변입니다.',
      fill_blank: '빈칸 채우기: 문장에서 핵심 용어를 제거합니다. front에는 빈칸(___사용), back에는 정답 단어를 넣습니다.',
      multiple_choice: '객관식: 4개의 선택지(정답 1개)가 있는 질문을 만드세요. id, text, isCorrect가 포함된 options 배열이 필수입니다.',
      short_answer: '단답형: 짧은 서술형 답변이 필요한 질문을 만드세요.',
    };

    return types
      .map((type) => `- ${typeDescriptions[type]}`)
      .join('\n');
  }

  /**
   * Evaluate user's answer using AI
   */
  async evaluateAnswer(
    expectedAnswer: string,
    userAnswer: string,
    context?: string
  ): Promise<AnswerEvaluation> {
    const prompt = `You are an educational assessment expert. Evaluate the student's answer.

Expected Answer:
"""
${expectedAnswer}
"""

Student's Answer:
"""
${userAnswer}
"""
${context ? `\nContext: ${context}` : ''}

Evaluate for meaning/understanding, not just exact word matching.

Return a JSON object:
{
  "isCorrect": true/false,
  "score": 0.0-1.0,
  "feedback": "Constructive feedback for the student",
  "correctPoints": ["Things they got right"],
  "missedPoints": ["Key points they missed"],
  "suggestion": "How to improve"
}

Return ONLY valid JSON.`;

    try {
      const response = await this.callAI(prompt);
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Unable to evaluate answer automatically. Please review manually.',
      };
    }
  }
}
