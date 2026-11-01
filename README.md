# 럭키방충망 홈페이지 (Vercel 배포용)

빌드 과정이 없는 정적 사이트 + 견적 접수용 서버리스 함수 1개로 구성되어 있습니다.

```
screen-site/
├─ public/            # 정적 파일 (Vercel이 그대로 서빙)
│  ├─ index.html
│  ├─ styles.css
│  ├─ script.js
│  └─ favicon.svg
├─ api/
│  └─ quote.js        # POST /api/quote — 견적 폼 접수
├─ vercel.json
└─ package.json
```

## 배포 방법

### A. GitHub 연동 (추천)
1. 이 폴더를 GitHub 저장소로 올립니다.
2. https://vercel.com/new 에서 저장소를 Import 합니다.
3. Framework Preset은 **Other** 그대로 두고 **Deploy**. (빌드 설정 변경 불필요)

### B. Vercel CLI
```bash
npm i -g vercel
cd screen-site
vercel          # 미리보기 배포
vercel --prod   # 운영 배포
```

로컬에서 실행해 보려면 `vercel dev` 후 http://localhost:3000 접속.

## 견적 폼 알림 받기

Vercel 프로젝트 → **Settings → Environment Variables** 에 추가:

| 이름 | 값 |
|---|---|
| `QUOTE_WEBHOOK_URL` | Slack / Discord 웹훅 URL, 또는 Make·Zapier 웹훅 URL |

- 설정하면 견적 요청이 들어올 때마다 해당 채널로 메시지가 전송됩니다.
- Make·Zapier를 쓰면 구글 시트 저장, 이메일, 카카오 알림톡 등으로 연결할 수 있습니다.
- 설정하지 않으면 Vercel 대시보드의 **Logs** 에만 기록됩니다.
- 환경변수 추가 후에는 **재배포**해야 적용됩니다.

## 배포 전 수정할 것
- 전화번호 `1588-0000`, 카카오톡 ID, 시공 지역
- 하단 사업자 정보(대표자, 사업자등록번호, 주소)
- 시공 실적 숫자와 고객 후기 (현재는 예시 문구)
- 오류 안내 문구의 전화번호: `public/script.js`
