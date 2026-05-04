# 제안서몰 (proposal-mall)

B2B 제안서 전문 인쇄·제본·박스 쇼핑몰. `proposal.blackcopy.co.kr` 도메인으로 운영.

## 스택

- **Frontend + Backend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **API**: Next.js API Routes
- **DB**: Supabase (PostgreSQL) + Prisma ORM
- **결제**: 사이다페이 (예정)
- **파일전달**: Dropbox API (예정)
- **이메일**: 네이버 SMTP
- **배포**: Railway

## 개발 셋업

```bash
# 1. 의존성 설치
npm install

# 2. .env 셋업 (.env.example 참고)
cp .env.example .env
#   → DATABASE_URL, SUPABASE_*, ADMIN_PASSWORD, ADMIN_SESSION_SECRET 채우기

# 3. Prisma 클라이언트 생성
npx prisma generate

# 4. DB 스키마 적용 — 둘 중 하나
#   a) Supabase SQL Editor에서 prisma/migrations/0001_init/migration.sql 직접 실행
#   b) DATABASE_URL이 설정되어 있다면:
npx prisma db push

# 5. 시드 데이터 (상품/단가표/FAQ/공지) — 둘 중 하나
#   a) Supabase SQL Editor에 prisma/seed.sql 붙여넣고 Run
#   b) DATABASE_URL이 설정되어 있다면:
npx prisma db seed

# 6. 개발 서버 시작
npm run dev
```

http://localhost:3000 에서 확인.

## 디자인 토큰

| 토큰          | 값        | 용도              |
| ------------- | --------- | ----------------- |
| `brand`       | `#E8481A` | 메인 (오렌지-레드)|
| `brand-dark`  | `#C93A10` | hover/active      |
| `brand-light` | `#FFF1EC` | 배경 강조         |
| `bg`          | `#F5F5F5` | 페이지 배경       |
| `ink`         | `#1A1A1A` | 본문              |
| `ink-sub`     | `#888888` | 보조 텍스트       |
| `line`        | `#E5E5E5` | 구분선            |

폰트: Noto Sans KR (400/500/700/800/900)
아이콘: SVG 라인 아이콘만 사용 (이모지 금지)

## 디렉터리 구조

```
proposal-mall/
├─ prisma/
│  ├─ schema.prisma          # 11개 테이블 모델
│  └─ migrations/0001_init/  # 초기 SQL 마이그레이션
├─ reference/                # HTML 프로토타입 (디자인 참고용)
├─ src/
│  ├─ app/                   # Next.js App Router (페이지 + API Routes)
│  │  ├─ admin/              # 관리자 패널 (비밀번호 보호)
│  │  └─ api/                # Next.js API Routes
│  ├─ components/            # Header, Footer, NoticeBar 등
│  └─ lib/                   # prisma, supabase, pricing, auth 헬퍼
├─ CLAUDE.md                 # 프로젝트 컨텍스트
└─ .env.example
```

## 메뉴 구조

`전체상품 / 주문현황 / 장바구니 / 고객문의`

상품 카테고리:

- 제안서캐리어박스 / 자석박스
- 3공바인더 (인쇄형/원단형) / PT용바인더 (인쇄형/원단형) / 하드커버스프링제본 (인쇄형/원단형)
- 내지 인쇄 (모조지/스노우지/아트지/수입지/질감용지)

## 가격 정책

- 수량 구간: `1` / `2-4` / `5-9` / `10+`
- 단순 계산: 수량 구간 × 단가표 단가 (옵션 가산)
- 배송: 택배 2,500원 / 30,000원 이상 무료 / 직접 방문 무료

## 주문 일련번호

`Pro-0001` 형식으로 자동 증가.

## Railway 배포

이 프로젝트는 Railway에 바로 올라가도록 셋업되어 있습니다 ([railway.json](railway.json) 참고).

### 1. Railway 프로젝트 생성

1. https://railway.app/new → "Deploy from GitHub repo"
2. `hyunghojeung/proposal-mall` 선택
3. 자동으로 nixpacks 빌더가 인식 → `npm ci && npm run build` → `npm run start`

### 2. 환경변수 등록

Railway 프로젝트 → Variables 에 [.env.example](.env.example) 의 모든 키를 입력:

**필수**
| 키 | 값 |
|---|---|
| `DATABASE_URL` | Supabase Transaction pooler URL (port 6543, `?pgbouncer=true`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (서버 전용) |
| `ADMIN_PASSWORD` | 관리자 패널 비밀번호 |
| `ADMIN_SESSION_SECRET` | 32자 이상 랜덤 문자열 |
| `NEXT_PUBLIC_SITE_URL` | `https://proposal.blackcopy.co.kr` |

**선택 (없으면 stub 모드)**
- 결제: `CIDAPAY_API_BASE` `CIDAPAY_MID` `CIDAPAY_API_KEY`
- 메일: `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM`
- Dropbox: `DROPBOX_APP_KEY` `DROPBOX_APP_SECRET` `DROPBOX_REFRESH_TOKEN` `DROPBOX_DEST_FOLDER`

> Railway는 `PORT` 를 자동 주입합니다. `next start -p ${PORT:-3000}` 가 이를 사용합니다.

### 3. DB 초기화 (1회)

Supabase SQL Editor에서 두 파일을 차례로 실행:

1. [prisma/migrations/0001_init/migration.sql](prisma/migrations/0001_init/migration.sql) — 11 테이블 생성
2. [prisma/seed.sql](prisma/seed.sql) — 상품/단가표/FAQ/공지 시드

> 또는 로컬에서 `DATABASE_URL` 채운 뒤 `npx prisma db push && npx prisma db seed`.

### 4. 배포 확인

- Railway 자동 빌드 → `https://<project>.up.railway.app/api/health` 호출 시 `{ok:true, db:"ok"}` 200
- `/admin/login` → `ADMIN_PASSWORD` 로 로그인 → 대시보드 진입 확인

### 5. 도메인 연결

1. Railway → Settings → Networking → "Custom domain" → `proposal.blackcopy.co.kr` 입력
2. Railway가 안내하는 CNAME 값을 가비아/카페24 등 도메인 DNS 관리에서 등록:
   ```
   CNAME  proposal  →  <railway-provided-target>.up.railway.app
   ```
3. DNS 전파 (~5분) 후 Railway가 SSL 자동 발급
4. Railway Variables의 `NEXT_PUBLIC_SITE_URL` 을 `https://proposal.blackcopy.co.kr` 로 갱신 → 재배포

### 헬스체크

- `GET /api/health` — DB ping 후 `{ok, db, uptimeMs, latencyMs}` 반환. DB 실패 시 503 → Railway가 자동 재시작.

## 운영 체크리스트

- [ ] `npm run build` 통과
- [ ] `/api/health` 200 OK
- [ ] `/admin` 로그인 + 대시보드 KPI 표시
- [ ] `/products` 6개 상품 + `/products/binding-3-ring` 가격 자동 계산
- [ ] 결제 stub 흐름: /cart → /checkout → /orders/Pro-#### + 장바구니 비워짐
- [ ] 사이다페이 실연동 (CIDAPAY_API_BASE 채우면 활성화)
- [ ] Dropbox refresh token + 네이버 SMTP 셋업 → 결제 후 메일 + 업로드 링크
- [ ] 도메인 SSL 발급 완료
