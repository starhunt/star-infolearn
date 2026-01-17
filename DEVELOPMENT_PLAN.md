# Star InfoLearn 개발계획서

## 1. 프로젝트 개요

### 1.1 프로젝트명
**Star InfoLearn** - AI 기반 인포그래픽 학습 도구

### 1.2 프로젝트 목적
Obsidian 사용자가 노트 내용을 다양한 AI 기반 학습 도구를 통해 효과적으로 학습할 수 있도록 지원하는 플러그인 개발

### 1.3 핵심 가치
- **능동적 학습**: 단순 읽기가 아닌 빈칸 채우기, 내용 재작성 등 능동적 학습 방식 제공
- **다양한 AI 지원**: 5개 AI 제공자(OpenAI, Anthropic, Gemini, Grok, Zhipu) 지원
- **통합 환경**: Obsidian 내에서 끊김 없는 학습 경험 제공

---

## 2. 기능 명세

### 2.1 핵심 기능

#### 2.1.1 Rewriting (내용 재작성)
| 스타일 | 설명 | 사용 사례 |
|--------|------|-----------|
| Summary | 2-3문장 요약 | 빠른 복습, 핵심 파악 |
| Detailed | 상세 설명 + 예시 | 깊은 이해 필요 시 |
| Beginner | 초보자 친화적 설명 | 새로운 개념 학습 |
| Expert | 전문가 수준 분석 | 심화 학습 |
| Story | 이야기 형식 | 기억력 향상 |
| Report | 비즈니스 보고서 형식 | 문서화 필요 시 |

#### 2.1.2 Blanking (빈칸 채우기)
- AI 기반 핵심 키워드 자동 식별
- 중요도 기반 키워드 선정
- 빈칸 문제 자동 생성
- 정답 확인 및 힌트 제공

#### 2.1.3 Association (연관 링크)
- 개념 간 연결 관계 생성
- 관계 유형: related, causes, explains, example, contrast
- 지식 그래프 시각화 (향후 구현)

### 2.2 AI 제공자 지원

| 제공자 | 기본 모델 | 상태 |
|--------|-----------|------|
| OpenAI | gpt-4-turbo | ✅ 구현 완료 |
| Anthropic | claude-3-opus | ✅ 구현 완료 |
| Google Gemini | gemini-2.0-flash | ✅ 구현 완료 |
| xAI Grok | grok-3 | ✅ 구현 완료 |
| Zhipu GLM | glm-4.7 | ✅ 구현 완료 |

---

## 3. 시스템 아키텍처

### 3.1 전체 구조

```
star-infolearn/
├── main.ts                    # 플러그인 진입점
├── src/
│   ├── services/              # 비즈니스 로직
│   │   ├── AIService.ts       # AI API 통신
│   │   ├── BlankingService.ts # 빈칸 채우기 로직
│   │   ├── RewritingService.ts# 내용 재작성 로직
│   │   ├── AssociationService.ts # 연관 링크 로직
│   │   ├── DataService.ts     # 데이터 저장/로드
│   │   └── TextExtractorService.ts # 텍스트 추출
│   ├── store/
│   │   └── appStore.ts        # Zustand 상태 관리
│   ├── types/                 # TypeScript 타입 정의
│   │   ├── ai.ts
│   │   ├── blanking.ts
│   │   ├── rewriting.ts
│   │   └── association.ts
│   ├── ui/                    # UI 컴포넌트
│   │   ├── InfoLearnView.ts   # 메인 사이드바 뷰
│   │   ├── MainContainer.tsx  # React 메인 컨테이너
│   │   ├── BlankingView.tsx
│   │   ├── RewritingView.tsx
│   │   ├── AssociationView.tsx
│   │   └── AISettingsPanel.tsx
│   └── styles/
│       └── main.css           # 스타일시트
└── manifest.json              # 플러그인 메타데이터
```

### 3.2 데이터 흐름

```
[사용자 입력]
     ↓
[Obsidian Editor] ──텍스트 선택──→ [컨텍스트 메뉴/명령어]
     ↓
[InfoLearnView] ──상태 업데이트──→ [Zustand Store]
     ↓
[Service Layer] ──API 호출──→ [AI Provider]
     ↓
[결과 처리] ──UI 업데이트──→ [사용자에게 표시]
```

### 3.3 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 런타임 | Obsidian API | latest |
| 언어 | TypeScript | 5.3+ |
| UI 프레임워크 | React | 18.2 |
| 상태 관리 | Zustand | 4.4 |
| HTTP 클라이언트 | Axios | 1.6 |
| PDF 처리 | pdfjs-dist | 4.0 |
| 빌드 도구 | esbuild | 0.20 |

---

## 4. 개발 로드맵

### Phase 1: 기반 구축 ✅ 완료
- [x] 프로젝트 구조 설정
- [x] TypeScript 환경 구성 (strict mode)
- [x] Obsidian 플러그인 기본 구조
- [x] AI Service 기본 구현
- [x] 5개 AI 제공자 연동

### Phase 2: 핵심 기능 ✅ 완료
- [x] Rewriting 기능 구현
- [x] Blanking 기능 구현
- [x] Association 기능 기본 구현
- [x] InfoLearnView 사이드바 구현
- [x] 설정 패널 구현

### Phase 3: UI/UX 개선 ✅ 완료
- [x] CSS 스타일링
- [x] 모드 전환 UI
- [x] 결과 표시 및 복사/삽입 기능
- [x] 에러 처리 및 사용자 피드백

### Phase 4: 고급 기능 (계획)
- [ ] 지식 그래프 시각화
- [ ] 학습 진행 상황 추적
- [ ] 스페이스드 리피티션 (간격 반복)
- [ ] 퀴즈 모드
- [ ] 통계 대시보드

### Phase 5: 최적화 및 배포 (계획)
- [ ] 성능 최적화
- [ ] 번들 크기 최적화
- [ ] 다국어 지원 (i18n)
- [ ] 커뮤니티 플러그인 등록
- [ ] 문서화

---

## 5. API 설계

### 5.1 AIService API

```typescript
class AIService {
  // AI 연결 테스트
  testConnection(provider: AIProvider): Promise<boolean>

  // 키워드 식별
  identifyKeywords(text: string, bounds: Bounds[]): Promise<KeywordIdentificationResult[]>

  // 내용 재작성
  rewriteContent(text: string, options: RewritingOptions): Promise<string>

  // 연관 관계 추천
  suggestAssociations(sourceText: string, targetText: string): Promise<AssociationSuggestion[]>
}
```

### 5.2 상태 관리 (Zustand Store)

```typescript
interface AppState {
  // UI 상태
  currentMode: 'blanking' | 'rewriting' | 'association' | 'settings' | null
  selectedText: string
  isLoading: boolean
  error: string | null

  // AI 상태
  currentAIProvider: AIProvider
  aiProviders: Record<AIProvider, AIProviderConfig>

  // 기능 데이터
  blankingData: BlankingData | null
  associationLinks: AssociationLink[]
  rewriteResult: string | null
}
```

---

## 6. 보안 고려사항

### 6.1 API 키 관리
- API 키는 Obsidian의 로컬 데이터 저장소에만 저장
- 키는 절대 외부로 전송되지 않음 (해당 AI 제공자 제외)
- UI에서 비밀번호 타입 입력 필드 사용

### 6.2 데이터 프라이버시
- 모든 학습 데이터는 로컬에 저장
- AI API 호출 시에만 텍스트 데이터 전송
- 사용자 동의 하에만 AI 기능 사용

### 6.3 네트워크 보안
- 모든 API 호출은 HTTPS 사용
- Authorization 헤더를 통한 인증 (URL 파라미터 사용 금지)

---

## 7. 테스트 계획

### 7.1 단위 테스트
- [ ] AIService 연결 테스트
- [ ] BlankingService 키워드 추출 테스트
- [ ] RewritingService 스타일별 테스트
- [ ] AssociationService 링크 생성 테스트

### 7.2 통합 테스트
- [ ] 플러그인 로드/언로드 테스트
- [ ] 뷰 등록 및 활성화 테스트
- [ ] 명령어 실행 테스트
- [ ] 컨텍스트 메뉴 테스트

### 7.3 사용자 테스트
- [ ] 다양한 길이의 텍스트 처리
- [ ] 여러 AI 제공자 전환
- [ ] 오프라인 상태 처리
- [ ] 에러 상황 대응

---

## 8. 유지보수 계획

### 8.1 버전 관리
- Semantic Versioning (MAJOR.MINOR.PATCH) 사용
- CHANGELOG.md 유지
- Git 태그를 통한 릴리스 관리

### 8.2 이슈 관리
- GitHub Issues 활용
- 버그/기능요청/개선 레이블 분류
- 마일스톤을 통한 릴리스 계획

### 8.3 문서화
- README.md: 설치 및 사용법
- CONTRIBUTING.md: 기여 가이드
- API 문서: 개발자용 문서

---

## 9. 예상 일정

| 단계 | 내용 | 예상 기간 | 상태 |
|------|------|-----------|------|
| Phase 1 | 기반 구축 | 1주 | ✅ 완료 |
| Phase 2 | 핵심 기능 | 2주 | ✅ 완료 |
| Phase 3 | UI/UX 개선 | 1주 | ✅ 완료 |
| Phase 4 | 고급 기능 | 3주 | 📋 계획 |
| Phase 5 | 최적화/배포 | 2주 | 📋 계획 |

---

## 10. 참고 자료

### 10.1 공식 문서
- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Google Gemini API](https://ai.google.dev/docs)

### 10.2 관련 기술
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

*문서 버전: 1.0*
*최종 수정일: 2026-01-17*
*작성자: Star InfoLearn Team*
