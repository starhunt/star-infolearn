/**
 * AI Service Types and Interfaces (v2 - 동적 제공자/모델 지원)
 */

/** AI 제공자 식별자 (string 기반, 커스텀 제공자 지원) */
export type AIProvider = string;

/** API 호출 형식 */
export type AIApiFormat = 'openai' | 'anthropic';

/** 인증 방식 */
export type AIAuthType = 'bearer' | 'x-api-key';

/**
 * AI 제공자 정의
 */
export interface AIProviderDefinition {
  /** 고유 식별자 (예: 'gemini', 'openai', 'my-custom') */
  id: string;
  /** 표시 이름 (예: 'Google Gemini') */
  name: string;
  /** API 엔드포인트 기본 URL */
  baseUrl: string;
  /** API 키 */
  apiKey: string;
  /** 인증 방식 */
  authType: AIAuthType;
  /** API 호출 형식 (기본: 'openai') */
  apiFormat: AIApiFormat;
  /** 빌트인 프리셋 여부 (프리셋은 삭제 불가) */
  isBuiltIn: boolean;
}

/**
 * AI 모델 정의
 */
export interface AIModelDefinition {
  /** 모델 ID (API 호출용, 예: 'gemini-2.0-flash') */
  id: string;
  /** 표시 이름 (예: 'Gemini 2.0 Flash') */
  name: string;
  /** 소속 제공자 ID */
  providerId: string;
  /** 활성화 여부 */
  enabled: boolean;
  /** 모델 전용 API 키 (미설정 시 제공자의 키 사용) */
  apiKey?: string;
}

/**
 * AI 서비스 설정
 */
/**
 * 용도별 AI 슬롯
 * - text: 텍스트 생성 (카드 생성, 답변 평가 등)
 * - image: 이미지 생성 (향후 확장)
 */
export interface AISlotConfig {
  providerId: string;
  modelId: string;
}

export interface AIServiceConfig {
  providers: AIProviderDefinition[];
  models: AIModelDefinition[];
  defaultProviderId: string;
  defaultModelId: string;
  /** 용도별 AI 슬롯 (미설정 시 default 사용) */
  slots?: Partial<Record<string, AISlotConfig>>;
}

/**
 * AI 응답
 */
export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 기본 프리셋 제공자 3개
 */
export const BUILT_IN_PROVIDERS: AIProviderDefinition[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    authType: 'bearer',
    apiFormat: 'openai',
    isBuiltIn: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    authType: 'bearer',
    apiFormat: 'openai',
    isBuiltIn: true,
  },
  {
    id: 'z.ai',
    name: 'z.ai',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    apiKey: '',
    authType: 'bearer',
    apiFormat: 'openai',
    isBuiltIn: true,
  },
];

/**
 * 기본 프리셋 모델
 */
export const BUILT_IN_MODELS: AIModelDefinition[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', providerId: 'gemini', enabled: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', providerId: 'openai', enabled: true },
  { id: 'glm-4.7', name: 'GLM-4.7', providerId: 'z.ai', enabled: true },
];

// === 하위 호환용 (마이그레이션 완료 후 제거 가능) ===

/** @deprecated v1 호환용 */
export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}
