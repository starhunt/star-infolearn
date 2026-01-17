# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 빌드 명령어

```bash
npm run dev      # 개발 모드 (watch)
npm run build    # 프로덕션 빌드 (tsc 타입 체크 + esbuild)
npm run test     # Jest 테스트 실행
npx tsc --noEmit # 타입 체크만 실행
```

## Obsidian에서 테스트

1. `main.js`, `styles.css`, `manifest.json`을 `.obsidian/plugins/star-infolearn/`에 복사
2. Obsidian 새로고침 (Ctrl+R / Cmd+R)
3. 설정 > 커뮤니티 플러그인에서 활성화

## 아키텍처 개요 (v2 - 2024.01 재설계)

Star InfoLearn는 **노트 기반 플래시카드 학습** Obsidian 플러그인입니다.

### 핵심 기능 (4개로 단순화)
1. **노트 기반 플래시카드 생성** - 텍스트 선택 → 우클릭 → AI 카드 생성
2. **퀴즈 시스템** - 4가지 유형 (flashcard, fill_blank, multiple_choice, short_answer)
3. **FSRS 간격 반복** - FSRS-4.5 알고리즘 기반 최적 복습 스케줄링
4. **학습 대시보드** - 통계, 복습할 카드 수, 빠른 복습 시작

### UI 모드 (4개)

| 모드 | 기능 |
|------|------|
| `study` | 학습 대시보드 (통계, 빠른 시작) |
| `review` | 복습 세션 (카드 플립, 퀴즈 풀이, FSRS 평가) |
| `card-editor` | 카드 생성/편집 (수동 + AI 생성) |
| `settings` | AI 제공자 설정 |

### 레이어 구조

```
main.ts (플러그인 진입점, Obsidian API 통합)
    ↓
src/ui/InfoLearnView.ts (메인 뷰, 4개 모드 렌더링)
    ↓
src/services/ (비즈니스 로직)
    ↓
src/store/appStore.ts (Zustand 글로벌 상태)
    ↓
src/types/ (TypeScript 인터페이스)
```

### 핵심 서비스

| 서비스 | 역할 |
|--------|------|
| `AIService` | 5개 AI 제공자 통합, 질문 생성, 답안 평가 |
| `QuestionGeneratorService` | 텍스트에서 4가지 유형의 학습 카드 생성 |
| `FSRSService` | FSRS-4.5 스케줄링, 복습 큐 관리 |
| `DataService` | Obsidian Vault 기반 로컬 저장 |

### 카드 타입 (4가지)

| 타입 | 설명 |
|------|------|
| `flashcard` | 앞/뒤 플래시카드 |
| `fill_blank` | 빈칸 채우기 (front에 `___` 포함) |
| `multiple_choice` | 4지선다 (options 배열 필수) |
| `short_answer` | 단답형 |

### 데이터 모델 (LearningCard)

```typescript
interface LearningCard {
  id: string;
  type: 'flashcard' | 'fill_blank' | 'multiple_choice' | 'short_answer';
  sourceFile: string;           // 원본 노트 경로
  sourceText?: string;          // 원본 텍스트 (참조용)
  front: string;                // 질문/앞면
  back: string;                 // 답/뒷면
  hint?: string;
  explanation?: string;
  options?: MCQOption[];        // 객관식 전용
  blanks?: BlankPosition[];     // 빈칸 채우기 전용
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  fsrsState: FSRSCardState;
  createdAt: number;
  updatedAt: number;
}
```

### AI 제공자별 인증 방식

| 제공자 | 인증 방식 | 엔드포인트 |
|--------|----------|-----------|
| OpenAI | Bearer 토큰 | `/v1/chat/completions` |
| Anthropic | x-api-key 헤더 | `/v1/messages` |
| Gemini | Bearer 토큰 | `/chat/completions` (OpenAI 호환) |
| Grok | Bearer 토큰 | `/v1/chat/completions` |
| Zhipu | Bearer 토큰 | `/chat/completions` |

### 상태 관리 (Zustand)

`src/store/appStore.ts`가 관리하는 주요 상태:
- `currentMode`: study | review | card-editor | settings
- `currentAIProvider`: 현재 선택된 AI 제공자
- `aiProviders`: 제공자별 설정 (API 키, 모델)
- `learningCards`: 학습 카드 배열
- `reviewState`: 복습 세션 상태 (현재 카드, 진행 상황, 사용자 답변)
- `todayStats`: 오늘 통계 (reviewed, newLearned, dueRemaining)

## 새 AI 제공자 추가 방법

1. `src/types/ai.ts`: `AIProvider` 타입에 새 제공자 추가
2. `src/services/AIService.ts`:
   - `getDefaultBaseURL()`에 기본 URL 추가
   - `getHeaders()`에 인증 헤더 패턴 추가
   - `callAI()` switch 문에 호출 메서드 추가
3. `main.ts`: `DEFAULT_SETTINGS.providers`에 기본 설정 추가

## 새 카드 타입 추가 방법

1. `src/types/learning.ts`: `LearningCardType`에 새 타입 추가
2. `src/services/AIService.ts`: `getQuestionTypePrompts()`에 프롬프트 추가
3. `src/ui/InfoLearnView.ts`: `renderReviewMode()`에 렌더링 로직 추가

## 에러 처리

커스텀 에러 타입이 `src/types/errors.ts`에 정의되어 있습니다:
- `AIServiceError`: AI API 호출 실패
- `ProviderNotConfiguredError`: 제공자 미설정
- `ApiKeyNotSetError`: API 키 미설정
- `RateLimitError`: 레이트 제한 초과
- `DataServiceError`: 데이터 저장/로드 실패

## 데이터 저장 경로

모든 데이터는 `.obsidian/plugins/star-infolearn/data/` 아래에 저장됩니다:
- `cards/` - 학습 카드 (각 카드별 JSON 파일)
- `decks/` - 덱/컬렉션
- `logs/` - 복습 로그 (날짜별)
- `stats/` - 일일 통계

## 제거된 기능 (v2 재설계)

다음 기능들은 복잡도 감소를 위해 제거되었습니다:
- OCR/이미지 분석 (TextExtractorService)
- 핫스팟 학습 (HotspotService)
- 시각적 마스킹 (VisualRecallService)
- 지식 그래프 (KnowledgeGraphService)
- 레거시 Blanking/Rewriting 모드

## 참고사항

- 빌드 크기: main.js ~268KB, styles.css ~27KB
- 노트 컨텍스트 메뉴에서 "Generate Flashcards" 또는 "Quick Generate with AI"로 카드 생성
- FSRS 평가: Again(1) / Hard(2) / Good(3) / Easy(4)
