/**
 * Custom Error Types for InfoLearn Pro
 */

import { AIProvider } from './ai';

/**
 * Base error class for InfoLearn Pro
 */
export class InfoLearnError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'InfoLearnError';
  }
}

/**
 * AI Service specific errors
 */
export class AIServiceError extends InfoLearnError {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message, 'AI_SERVICE_ERROR');
    this.name = 'AIServiceError';
  }

  static fromAxiosError(provider: AIProvider, error: unknown): AIServiceError {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message;

      return new AIServiceError(
        `${provider} API error: ${message}`,
        provider,
        status,
        error
      );
    }

    return new AIServiceError(
      `${provider} API error: ${String(error)}`,
      provider,
      undefined,
      error
    );
  }
}

/**
 * Provider not configured error
 */
export class ProviderNotConfiguredError extends AIServiceError {
  constructor(provider: AIProvider) {
    super(`Provider ${provider} is not configured`, provider);
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * API key not set error
 */
export class ApiKeyNotSetError extends AIServiceError {
  constructor(provider: AIProvider) {
    super(`API key not set for ${provider}`, provider);
    this.name = 'ApiKeyNotSetError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AIServiceError {
  constructor(
    provider: AIProvider,
    public readonly retryAfter?: number
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Text extraction errors
 */
export class TextExtractionError extends InfoLearnError {
  constructor(
    message: string,
    public readonly fileType: string,
    public readonly originalError?: unknown
  ) {
    super(message, 'TEXT_EXTRACTION_ERROR');
    this.name = 'TextExtractionError';
  }
}

/**
 * Data service errors
 */
export class DataServiceError extends InfoLearnError {
  constructor(
    message: string,
    public readonly operation: 'save' | 'load' | 'delete' | 'initialize',
    public readonly originalError?: unknown
  ) {
    super(message, 'DATA_SERVICE_ERROR');
    this.name = 'DataServiceError';
  }
}

/**
 * Type guard for Axios errors
 */
interface AxiosErrorLike {
  isAxiosError: boolean;
  response?: {
    status?: number;
    data?: {
      error?: { message?: string };
      message?: string;
    };
  };
  message: string;
}

export function isAxiosError(error: unknown): error is AxiosErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosErrorLike).isAxiosError === true
  );
}
