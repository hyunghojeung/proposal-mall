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

# 5. 개발 서버 시작
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

## 다음 단계

- [ ] 단가표 시드 + 엑셀 업/다운로드
- [ ] 상품 상세 + 옵션 선택 + 가격 자동 계산 UI
- [ ] 장바구니 / 결제 흐름 (사이다페이)
- [ ] Dropbox 파일 전달 자동화
- [ ] 관리자 CRUD UI
- [ ] Railway 배포 + 도메인 연결
