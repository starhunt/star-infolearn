/**
 * Blanking Feature Types
 */

export interface BlankingState {
  isActive: boolean;
  blanks: BlankItem[];
  answers: Record<string, string>; // blankId -> userAnswer
  results: Record<string, boolean>; // blankId -> isCorrect
  currentBlankId: string | null;
}

export interface BlankItem {
  id: string;
  keyword: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  importance: number;
  isAnswered: boolean;
  isCorrect?: boolean;
}

export interface BlankingConfig {
  autoGenerate: boolean;
  numberOfBlanks: number;
  showHints: boolean;
  caseSensitive: boolean;
  allowPartialMatch: boolean;
  highlightColor: string;
}

export interface BlankingResult {
  totalBlanks: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredBlanks: number;
  accuracy: number; // percentage
  timeSpent: number; // milliseconds
}
