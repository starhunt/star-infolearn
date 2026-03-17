/**
 * AI Service - 동적 제공자/모델 기반 AI 통신 (v2)
 */

import axios, { AxiosInstance } from 'axios';
import { AIProviderDefinition, AIModelDefinition, AIServiceConfig } from '../types/ai';
import { AIServiceError, ProviderNotConfiguredError, ApiKeyNotSetError, RateLimitError, isAxiosError } from '../types/errors';
import { LearningCard, LearningCardType, createLearningCard, QuestionGenerationRequest, QuestionGenerationResult, AnswerEvaluation } from '../types/learning';

export class AIService {
  private config: AIServiceConfig;
  private axiosInstances: Map<string, AxiosInstance> = new Map();

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.initializeAxiosInstances();
  }

  private initializeAxiosInstances(): void {
    for (const provider of this.config.providers) {
      if (provider.apiKey) {
        this.axiosInstances.set(provider.id, this.createAxiosInstance(provider));
      }
    }
  }

  private createAxiosInstance(provider: AIProviderDefinition): AxiosInstance {
    return axios.create({
      baseURL: provider.baseUrl,
      timeout: 300000,
      headers: this.getHeaders(provider),
    });
  }

  private getHeaders(provider: AIProviderDefinition): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        break;
      case 'x-api-key':
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
    }

    return headers;
  }

  /** 제공자 찾기 */
  private findProvider(providerId: string): AIProviderDefinition | undefined {
    return this.config.providers.find(p => p.id === providerId);
  }

  /** 모델 찾기 */
  private findModel(modelId: string): AIModelDefinition | undefined {
    return this.config.models.find(m => m.id === modelId);
  }

  /** 모델에 개별 API 키가 있으면 해당 키로 인스턴스 생성 */
  private getInstanceForModel(provider: AIProviderDefinition, model?: AIModelDefinition): AxiosInstance {
    // 모델 전용 API 키가 있으면 별도 인스턴스 생성
    if (model?.apiKey) {
      const overridden: AIProviderDefinition = { ...provider, apiKey: model.apiKey };
      return this.createAxiosInstance(overridden);
    }

    // 제공자 기본 인스턴스 사용 (없으면 생성)
    const existing = this.axiosInstances.get(provider.id);
    if (existing) return existing;

    const newInstance = this.createAxiosInstance(provider);
    this.axiosInstances.set(provider.id, newInstance);
    return newInstance;
  }

  /** 현재 기본 제공자+모델로 AI 호출 */
  private async callAI(prompt: string): Promise<string> {
    const provider = this.findProvider(this.config.defaultProviderId);
    if (!provider) {
      throw new ProviderNotConfiguredError(this.config.defaultProviderId);
    }

    const model = this.findModel(this.config.defaultModelId);
    const effectiveApiKey = model?.apiKey || provider.apiKey;
    if (!effectiveApiKey) {
      throw new ApiKeyNotSetError(this.config.defaultProviderId);
    }

    const instance = this.getInstanceForModel(provider, model);
    return this.callWithInstance(instance, provider, this.config.defaultModelId, prompt);
  }

  /** 인스턴스를 사용한 실제 호출 */
  private async callWithInstance(
    instance: AxiosInstance,
    provider: AIProviderDefinition,
    modelId: string,
    prompt: string
  ): Promise<string> {
    try {
      if (provider.apiFormat === 'anthropic') {
        return await this.callAnthropic(instance, modelId, prompt);
      }
      return await this.callOpenAICompatible(instance, modelId, prompt);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      if (isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = parseInt(error.response?.data?.retry_after || '60', 10);
        throw new RateLimitError(provider.id, retryAfter);
      }
      throw AIServiceError.fromAxiosError(provider.id, error);
    }
  }

  /** OpenAI 호환 API 호출 (Gemini, OpenAI, z.ai, Grok 등) */
  private async callOpenAICompatible(
    instance: AxiosInstance,
    model: string,
    prompt: string
  ): Promise<string> {
    const response = await instance.post('/chat/completions', {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 16000,
    });
    return response.data.choices[0].message.content;
  }

  /** Anthropic API 호출 */
  private async callAnthropic(
    instance: AxiosInstance,
    model: string,
    prompt: string
  ): Promise<string> {
    const response = await instance.post('/messages', {
      model,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.data.content[0].text;
  }

  /** 연결 테스트 (특정 제공자+모델, 임시 API 키 지원) */
  async testConnection(providerId: string, modelId?: string, overrideApiKey?: string): Promise<boolean> {
    try {
      const provider = this.findProvider(providerId);
      if (!provider) {
        return false;
      }

      const testModel = modelId || this.config.models.find(m => m.providerId === providerId)?.id;
      if (!testModel) {
        return false;
      }

      // API 키 우선순위: overrideApiKey > 모델 apiKey > 제공자 apiKey
      const model = this.findModel(testModel);
      const effectiveApiKey = overrideApiKey || model?.apiKey || provider.apiKey;
      if (!effectiveApiKey) {
        return false;
      }

      const testProvider: AIProviderDefinition = { ...provider, apiKey: effectiveApiKey };
      const testInstance = this.createAxiosInstance(testProvider);
      const testPrompt = 'Say "OK" only.';

      if (provider.apiFormat === 'anthropic') {
        await testInstance.post('/messages', {
          model: testModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: testPrompt }],
        });
      } else {
        await testInstance.post('/chat/completions', {
          model: testModel,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 10,
        });
      }

      return true;
    } catch (error) {
      console.error(`Connection test failed for ${providerId}:`, error);
      return false;
    }
  }

  /** 설정 업데이트 */
  updateConfig(config: AIServiceConfig): void {
    this.config = config;
    this.axiosInstances.clear();
    this.initializeAxiosInstances();
  }

  getConfig(): AIServiceConfig {
    return this.config;
  }

  /**
   * 학습 질문 생성
   */
  async generateQuestions(
    request: QuestionGenerationRequest
  ): Promise<QuestionGenerationResult> {
    const provider = this.findProvider(this.config.defaultProviderId);
    if (!provider) {
      throw new ProviderNotConfiguredError(this.config.defaultProviderId);
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

      let jsonStr = response.trim();
      console.log('AI raw response length:', response.length);

      if (!jsonStr) {
        throw new AIServiceError('Empty response from AI', this.config.defaultProviderId);
      }

      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
      }

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
          this.config.defaultProviderId
        );
      }

      const cards: LearningCard[] = result.cards.map((cardData: Record<string, unknown>) => {
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
      throw AIServiceError.fromAxiosError(this.config.defaultProviderId, error);
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
   * 사용자 답변 평가
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
