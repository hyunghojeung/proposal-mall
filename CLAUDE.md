# 제안서몰 프로젝트 컨텍스트

## 프로젝트 개요
- B2B 제안서 전문 인쇄·제본·박스 쇼핑몰
- 도메인: proposal.blackcopy.co.kr (blackcopy.co.kr 서브도메인)

## 기술 스택
- Frontend: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- Backend: NestJS + Prisma ORM
- DB: Supabase (PostgreSQL)
- 배포: Railway (Frontend + Backend)
- 결제: 사이다페이
- 파일전달: Dropbox API
- 이메일: 네이버 SMTP (smtp.naver.com / blackcopy2@naver.com)

## 디자인 시스템
- 메인 색상: #E8481A (오렌지-레드)
- 배경: #F5F5F5
- 텍스트: #1A1A1A
- 보조: #888888
- 폰트: Noto Sans KR (400/500/700/800/900)
- 아이콘: SVG 라인 아이콘만 사용 (이모지 절대 사용 금지)

## 메뉴 구조 (GNB)
전체상품 / 주문현황 / 장바구니 / 고객문의
(아이콘 없음, +3000P 없음)

## 전체상품 카테고리
- 제안서캐리어박스
- 자석박스
- 제안서 제본
  - 3공바인더 (인쇄형 / 원단형)
  - PT용바인더 (인쇄형 / 원단형)
  - 하드커버스프링제본 (인쇄형 / 원단형)
- 내지 인쇄
  - 모조지 / 스노우지 / 아트지 / 수입지 / 질감용지

## 페이지 목록
1. 홈 (메인)
2. 상품 목록 / 상세
3. 장바구니
4. 주문현황 (실시간 공개)
5. 고객문의 (1:1문의 / FAQ / 문의내역)
6. 관리자 패널 (비밀번호 보호)

## 관리자 패널 메뉴
- 주문현황
- 상품 관리
- 옵션 관리
- 단가표 관리 (엑셀 업로드/다운로드)
- 고객문의 관리
- FAQ 관리
- 공지사항 관리

## DB 테이블
- products (상품)
- option_groups (옵션 그룹)
- option_values (옵션 값)
- price_paper (내지 단가표)
- price_binding (제본 단가표)
- price_box (박스 단가표)
- orders (주문)
- order_items (주문 상품)
- inquiries (고객문의)
- faqs (자주묻는질문)
- notices (공지사항)

## 주문 일련번호 형식
Pro-0001 형식으로 자동 증가

## 가격 계산 방식
- 단순 계산: 수량 구간 × 단가표 단가
- 옵션 선택 → 단가표에서 자동 계산
- 수량 구간: 1 / 2~4 / 5~9 / 10↑

## 배송
- 택배 배송: 2,500원 (30,000원 이상 무료)
- 직접 방문 수령: 무료

## 파일 전달 방법
- Dropbox 링크 전송 (결제 후 자동 발송)
- 이메일 접수: blackcopy2@naver.com

## 반응형 기준
- 모바일: 375px~767px
- 태블릿: 768px~1023px
- 데스크탑: 1024px↑

## 완성된 HTML 프로토타입 (참고용)
- proposal_mall_v6_final.html (홈페이지)
- cart.html (장바구니)
- order_status.html (주문현황)
- contact.html (고객문의)
- admin_panel.html (관리자패널)
→ 위 파일들의 디자인·레이아웃·기능을 그대로 Next.js로 구현

## 개발 시 주의사항
- 이모지 아이콘 사용 금지 (SVG만 사용)
- Tailwind CSS로 반응형 구현
- 모든 텍스트는 한국어
- 관리자 패널은 별도 URL (/admin)
- 환경변수는 .env 파일 참조