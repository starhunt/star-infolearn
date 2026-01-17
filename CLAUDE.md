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

1. `main.js`와 `manifest.json`을 `.obsidian/plugins/infolearn-pro/`에 복사
2. Obsidian 새로고침 (Ctrl+R / Cmd+R)
3. 설정 > 커뮤니티 플러그인에서 활성화

## 아키텍처 개요

InfoLearn Pro는 3가지 학습 모드를 제공하는 Obsidian 플러그인입니다:
- **Blanking**: AI 기반 빈칸 채우기 학습
- **Rewriting**: 6가지 스타일의 콘텐츠 재작성
- **Association**: 개념 간 지식 그래프 구축

### 레이어 구조

```
main.ts (플러그인 진입점, Obsidian API 통합)
    ↓
src/ui/ (React 컴포넌트 + Obsidian 뷰)
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
| `AIService` | 5개 AI 제공자 통합 (OpenAI, Anthropic, Gemini, Grok, Zhipu) |
| `BlankingService` | 키워드 식별 및 답변 검증 |
| `RewritingService` | 6가지 스타일 재작성 (summary, detailed, beginner, expert, story, report) |
| `AssociationService` | 지식 그래프 링크 관리 |
| `DataService` | Obsidian Vault 기반 로컬 저장 |
| `TextExtractorService` | PDF/이미지 텍스트 추출 (현재 목업) |

### AI 제공자별 인증 방식

| 제공자 | 인증 방식 | 엔드포인트 |
|--------|----------|-----------|
| OpenAI | Bearer 토큰 | `/v1/chat/completions` |
| Anthropic | x-api-key 헤더 | `/v1/messages` |
| Gemini | URL 쿼리 파라미터 | `/chat/completions?key=` |
| Grok | Bearer 토큰 | `/v1/chat/completions` |
| Zhipu | Bearer 토큰 | `/chat/completions` |

### 상태 관리

Zustand 스토어 (`src/store/appStore.ts`)가 관리하는 상태:
- `currentMode`: blanking | rewriting | association | settings
- `currentAIProvider`: 현재 선택된 AI 제공자
- `aiProviders`: 제공자별 설정 (API 키, 모델)
- `blankingData`, `associationLinks`, `rewriteResult`: 기능별 데이터

플러그인 설정은 `main.ts`의 `saveSettings()`에서 `useAppStore.setState()`로 스토어와 동기화됩니다.

## 새 AI 제공자 추가 방법

1. `src/types/ai.ts`: `AIProvider` 타입에 새 제공자 추가
2. `src/services/AIService.ts`:
   - `getDefaultBaseURL()`에 기본 URL 추가
   - `getHeaders()`에 인증 헤더 패턴 추가
   - `callAI()` switch 문에 호출 메서드 추가
3. `main.ts`: `DEFAULT_SETTINGS.providers`에 기본 설정 추가

## 알려진 이슈 및 개선 필요사항

### 긴급
- **TextExtractorService**: PDF/이미지 추출이 목업만 존재, 실제 구현 필요 (PDF.js, Tesseract.js)
- **Gemini 보안**: API 키가 URL 쿼리 파라미터로 전송됨 - Authorization 헤더로 변경 권장

### 중요
- 테스트 파일 없음 (Jest 설정은 있음)
- TypeScript strict 모드 미활성화
- API 응답 검증 및 에러 타입 정의 부재
- 레이트 제한 처리 없음

### 참고
- `react`, `react-dom` 의존성이 있으나 실제로는 사용 안함 (JSX는 TypeScript가 처리)
- `pdf-parse` 의존성 있으나 미사용
