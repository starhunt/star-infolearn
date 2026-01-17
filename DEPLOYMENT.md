# InfoLearn Pro - Deployment & Distribution Guide

## 📦 Distribution Packages

InfoLearn Pro는 두 가지 배포 패키지로 제공됩니다:

### 1. **배포본 (infolearn-pro-dist.zip)** - 사용자용
- 플러그인 설치 파일만 포함
- 크기: ~46KB
- 포함 파일:
  - `main.js` (번들된 플러그인 코드)
  - `manifest.json` (플러그인 메타데이터)

**사용 목적:**
- 최종 사용자가 옵시디언에 설치
- 플러그인 마켓플레이스 배포
- 빠른 다운로드 및 설치

### 2. **개발환경 (infolearn-pro-dev.zip)** - 개발자용
- 전체 소스 코드 포함
- 크기: ~121KB
- 포함 파일:
  - 모든 TypeScript 소스 파일
  - 설정 파일 (tsconfig.json, esbuild.config.mjs)
  - 문서 (README.md, DEVELOPMENT.md, INSTALLATION.md)
  - package.json 및 package-lock.json
  - 빌드된 main.js

**사용 목적:**
- 플러그인 개발 및 수정
- 기여 및 커뮤니티 개발
- 로컬 환경에서 빌드 및 테스트

## 🚀 설치 방법

### 옵션 1: 배포본 설치 (권장)

#### 1.1 Obsidian 커뮤니티 플러그인 (향후)
```
1. Obsidian 설정 → 커뮤니티 플러그인
2. "InfoLearn Pro" 검색
3. 설치 클릭
```

#### 1.2 수동 설치
```bash
# 1. infolearn-pro-dist.zip 다운로드 및 추출

# 2. Obsidian 플러그인 폴더로 이동
cd ~/.obsidian/plugins/

# 3. infolearn-pro 폴더 생성
mkdir infolearn-pro

# 4. 파일 복사
cp /path/to/dist/main.js infolearn-pro/
cp /path/to/dist/manifest.json infolearn-pro/

# 5. Obsidian 재시작
# 설정 → 커뮤니티 플러그인 → InfoLearn Pro 활성화
```

### 옵션 2: 개발환경 설정

```bash
# 1. infolearn-pro-dev.zip 다운로드 및 추출
unzip infolearn-pro-dev.zip
cd infolearn-pro

# 2. 의존성 설치
npm install

# 3. 개발 모드 시작
npm run dev

# 또는 빌드만 수행
npm run build

# 4. 플러그인 폴더에 복사
cp main.js manifest.json ~/.obsidian/plugins/infolearn-pro/
```

## 🔧 빌드 및 배포

### 빌드 프로세스

```bash
# TypeScript 컴파일 및 번들링
npm run build

# 결과:
# - main.js (199KB) - 번들된 플러그인
# - manifest.json - 플러그인 메타데이터
```

### 배포 패키지 생성

```bash
# 배포본 생성
mkdir dist
cp main.js manifest.json dist/
cd dist
zip -r infolearn-pro-dist.zip main.js manifest.json -j

# 개발환경 생성
cd ..
zip -r infolearn-pro-dev.zip . \
  -x "node_modules/*" ".git/*" "dist/*"
```

## 📋 파일 구조

### 배포본 구조
```
infolearn-pro-dist.zip
├── main.js          (199KB - 번들된 플러그인)
└── manifest.json    (메타데이터)
```

### 개발환경 구조
```
infolearn-pro-dev.zip
├── src/
│   ├── types/       (타입 정의)
│   ├── services/    (비즈니스 로직)
│   ├── ui/          (UI 컴포넌트)
│   ├── store/       (상태 관리)
│   └── styles/      (CSS 스타일)
├── main.ts          (플러그인 진입점)
├── manifest.json    (플러그인 메타데이터)
├── package.json     (의존성)
├── tsconfig.json    (TypeScript 설정)
├── esbuild.config.mjs (빌드 설정)
├── README.md        (사용자 가이드)
├── DEVELOPMENT.md   (개발자 가이드)
├── INSTALLATION.md  (설치 가이드)
└── DEPLOYMENT.md    (이 파일)
```

## 🔐 API 키 관리

### 설정 저장 위치

API 키는 Obsidian의 로컬 데이터 디렉토리에 저장됩니다:

```
.obsidian/plugins/infolearn-pro/data.json
```

### 설정 파일 구조

```json
{
  "defaultProvider": "gemini",
  "providers": {
    "openai": {
      "provider": "openai",
      "apiKey": "sk-...",
      "model": "gpt-4-turbo",
      "baseUrl": "https://api.openai.com/v1"
    },
    "anthropic": {
      "provider": "anthropic",
      "apiKey": "sk-ant-...",
      "model": "claude-3-opus",
      "baseUrl": "https://api.anthropic.com/v1"
    },
    "gemini": {
      "provider": "gemini",
      "apiKey": "AIza...",
      "model": "gemini-2.0-flash",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai"
    },
    "grok": {
      "provider": "grok",
      "apiKey": "xai-...",
      "model": "grok-3",
      "baseUrl": "https://api.x.ai/v1"
    },
    "zhipu": {
      "provider": "zhipu",
      "apiKey": "...",
      "model": "glm-4.7",
      "baseUrl": "https://api.z.ai/api/coding/paas/v4"
    }
  }
}
```

### 보안 주의사항

1. **로컬 저장**: 모든 API 키는 로컬에만 저장됨
2. **암호화**: Obsidian의 기본 암호화 메커니즘 사용
3. **백업**: 정기적으로 설정 파일 백업
4. **키 로테이션**: 주기적으로 API 키 변경

## 🔄 업데이트 프로세스

### 사용자 업데이트

```bash
# 1. 새 배포본 다운로드
# 2. 기존 플러그인 폴더 백업
cp -r ~/.obsidian/plugins/infolearn-pro ~/.obsidian/plugins/infolearn-pro.backup

# 3. 새 파일로 덮어쓰기
cp new-main.js ~/.obsidian/plugins/infolearn-pro/main.js
cp new-manifest.json ~/.obsidian/plugins/infolearn-pro/manifest.json

# 4. Obsidian 재시작
```

### 개발자 업데이트

```bash
# 1. 소스 코드 수정
# 2. 빌드
npm run build

# 3. 테스트
npm run dev

# 4. 배포본 생성
npm run build
# 배포 패키지 생성
```

## 📊 버전 관리

### 버전 번호 형식

```
MAJOR.MINOR.PATCH
예: 1.0.0
```

### manifest.json 버전 업데이트

```json
{
  "id": "infolearn-pro",
  "name": "InfoLearn Pro",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Advanced Infographic Learning Tool",
  "author": "InfoLearn Team",
  "authorUrl": "https://github.com/infolearn-pro",
  "fundingUrl": "https://github.com/infolearn-pro",
  "isDesktopOnly": false
}
```

## 🐛 문제 해결

### 플러그인이 로드되지 않음

```bash
# 1. 파일 확인
ls -la ~/.obsidian/plugins/infolearn-pro/
# main.js와 manifest.json이 있는지 확인

# 2. 권한 확인
chmod 644 ~/.obsidian/plugins/infolearn-pro/main.js
chmod 644 ~/.obsidian/plugins/infolearn-pro/manifest.json

# 3. Obsidian 재시작
# Ctrl+R (또는 Cmd+R)

# 4. 콘솔 확인
# Ctrl+Shift+I (개발자 도구)
```

### 빌드 오류

```bash
# 1. 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 2. 캐시 초기화
npm cache clean --force

# 3. 빌드 재시도
npm run build
```

## 📝 릴리스 체크리스트

배포 전 확인사항:

- [ ] 모든 기능 테스트 완료
- [ ] TypeScript 컴파일 오류 없음
- [ ] 빌드 성공 (main.js 생성됨)
- [ ] manifest.json 버전 업데이트
- [ ] README.md 업데이트
- [ ] CHANGELOG.md 작성
- [ ] 배포본 zip 생성
- [ ] 개발환경 zip 생성
- [ ] 파일 크기 확인
  - main.js: < 500KB
  - 배포본: < 100KB
  - 개발환경: < 200KB

## 🚀 배포 채널

### 1. GitHub Releases
```
https://github.com/infolearn-pro/releases
```

### 2. Obsidian 커뮤니티 플러그인 마켓플레이스
```
https://obsidian.md/plugins?id=infolearn-pro
```

### 3. 직접 배포
```
https://infolearn-pro.com/download
```

## 📞 지원

- **문제 보고**: https://github.com/infolearn-pro/issues
- **기능 요청**: https://github.com/infolearn-pro/discussions
- **이메일**: support@infolearn-pro.com

---

**InfoLearn Pro 배포 가이드 완료!** 🎉
