# 럭키방충망 홈페이지 (Vercel 배포용)

빌드 과정이 없는 정적 사이트 + Vercel 서버리스 함수로 구성되어 있습니다.

```
screen-site/
├─ public/                 # 정적 파일 (Vercel이 그대로 서빙)
│  ├─ index.html           # 홈페이지
│  ├─ styles.css / script.js / favicon.svg / robots.txt
│  └─ admin/               # 관리자 화면  →  https://도메인/admin
├─ api/
│  ├─ quote.js             # POST /api/quote        견적 신청 접수
│  ├─ settings.js          # GET  /api/settings     홈페이지용 연락처 설정
│  ├─ admin/
│  │  ├─ login.js          # 관리자 로그인 / 로그아웃
│  │  ├─ quotes.js         # 견적 목록 · 상태 변경 · 메모 · 삭제
│  │  └─ settings.js       # 연락처 · 사업자 정보 수정
│  └─ _lib/                # 공용 코드 (Redis, 인증, 설정)
├─ vercel.json
└─ package.json
```

## 1. 배포

1. https://vercel.com/new 에서 이 GitHub 저장소를 Import
2. Framework Preset은 **Other** 그대로 두고 **Deploy**

## 2. 관리자 기능 켜기 (필수 설정 2가지)

### ① 데이터베이스 연결 — Upstash Redis (무료 플랜 가능)
Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash for Redis** 선택 → 프로젝트에 연결.
연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 추가됩니다.

### ② 관리자 비밀번호
Vercel 프로젝트 → **Settings → Environment Variables** 에 추가:

| 이름 | 값 |
|---|---|
| `ADMIN_PASSWORD` | 관리자 비밀번호 (12자 이상, 추측하기 어려운 값) |

두 가지를 설정한 뒤 **Deployments → Redeploy** 해야 적용됩니다.
이후 `https://내도메인/admin` 으로 접속해 로그인합니다.

- 로그인은 12시간 유지됩니다.
- 비밀번호를 10번 틀리면 15분간 로그인이 막힙니다.
- 비밀번호를 바꾸면 기존 로그인은 모두 풀립니다.

## 3. 관리자 화면에서 할 수 있는 것

**견적 관리**
- 홈페이지로 들어온 견적 신청 목록 (최신순, 1분마다 자동 새로고침)
- 상태 관리: 신규 → 연락완료 → 시공예약 → 시공완료 / 취소
- 메모 남기기 (통화 내용, 견적 금액 등 — 고객에게 보이지 않음)
- 이름 · 연락처 · 주소 검색, 상태별 필터
- 엑셀(CSV) 내려받기
- 연락처를 누르면 바로 전화 연결 (휴대폰)

**사이트 설정**
- 대표전화, 문자 번호, 카카오톡 채널 주소, 블로그 주소, 상담시간
- 대표자, 사업자등록번호, 사업장 주소
- 저장하면 1분 안에 홈페이지의 모든 버튼 · 문구에 반영됩니다.

## 4. (선택) 견적 알림 받기

| 이름 | 값 |
|---|---|
| `QUOTE_WEBHOOK_URL` | Slack / Discord 웹훅 URL, 또는 Make·Zapier 웹훅 URL |

설정하면 견적이 들어올 때마다 해당 채널로도 메시지가 갑니다. (관리자 화면 저장과 동시에 동작)

## 5. 로컬에서 실행

```bash
npm i -g vercel
vercel link        # 처음 한 번
vercel env pull    # 환경변수 내려받기
vercel dev         # http://localhost:3000
```

## 배포 전 수정할 것
- 시공 실적 숫자, 고객 후기, 시공 지역 (현재는 예시 문구) → `public/index.html`
- 시공 사진 → `public/images/` 에 넣고 각 `.ph` 칸에 `<img>` 추가
- 연락처 · 사업자 정보는 관리자 화면 → **사이트 설정**에서 바꾸면 됩니다.
