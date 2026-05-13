/**
 * 가상 주문 데이터 시드 스크립트
 * 사용법: npx tsx scripts/seed-orders.ts
 *
 * - 기존 order_items, orders 전체 삭제
 * - 2026년 1월 ~ 오늘(5월 13일)까지 월 6건씩 삽입
 * - 제품: 표준형 / 커스텀 랜덤
 * - 이름·이메일·전화번호·배송방법 랜덤
 */

import dotenv from "dotenv";
import { PrismaClient, DeliveryMethod, OrderStatus } from "@prisma/client";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

/* ── 랜덤 유틸 ── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ── 가상 고객 데이터 ── */
const LAST_NAMES  = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "전"];
const FIRST_NAMES = ["민준", "서연", "도윤", "서현", "예준", "지우", "시우", "서윤", "주원", "하은", "지호", "민서", "준서", "하린", "지원", "수빈", "지훈", "나은", "현우", "다은"];
const COMPANIES   = ["(주)대한기획", "삼성물산", "현대건설", "LG유플러스", "SK텔레콤", "롯데제과", "CJ제일제당", "포스코", "한화솔루션", "KT&G", "신세계그룹", "GS칼텍스", "두산중공업", "한국전력", "아모레퍼시픽", "넥슨코리아", "카카오", "네이버", "쿠팡", "배달의민족"];
const EMAIL_DOMAINS = ["gmail.com", "naver.com", "kakao.com", "daum.net", "hanmail.net", "nate.com", "outlook.com"];

function randomName() {
  return pick(LAST_NAMES) + pick(FIRST_NAMES);
}
function randomPhone() {
  return `010-${String(rand(1000, 9999))}-${String(rand(1000, 9999))}`;
}
function randomEmail(name: string) {
  const id = name.replace(/[^a-zA-Z0-9]/g, "") || "user";
  return `${id}${rand(10, 99)}@${pick(EMAIL_DOMAINS)}`;
}

/* ── 상품 정의 ── */
interface ProductDef {
  name: string;
  type: "standard" | "custom";
  prices: number[];          // [소량, 중간, 대량]
  quantities: number[];      // 가능 수량 풀
}

const PRODUCTS: ProductDef[] = [
  // 표준형
  { name: "제안서캐리어박스 (표준사이즈)",        type: "standard", prices: [85000, 68000, 52000],  quantities: [5, 10, 20, 30, 50] },
  { name: "제안서캐리어박스 표준 A4",             type: "standard", prices: [90000, 72000, 55000],  quantities: [5, 10, 20, 30] },
  { name: "자석박스 표준형",                       type: "standard", prices: [45000, 36000, 28000],  quantities: [10, 20, 30, 50, 100] },
  { name: "3공바인더 인쇄형 A4",                  type: "standard", prices: [38000, 30000, 24000],  quantities: [10, 20, 50, 100] },
  { name: "PT용바인더 인쇄형",                    type: "standard", prices: [42000, 34000, 27000],  quantities: [10, 20, 30, 50] },
  { name: "하드커버스프링제본 인쇄형",             type: "standard", prices: [35000, 28000, 22000],  quantities: [10, 20, 30, 50, 100] },
  // 커스텀
  { name: "제안서캐리어박스 커스텀 맞춤제작",      type: "custom",   prices: [185000, 155000, 125000], quantities: [10, 20, 30, 50] },
  { name: "자석박스 커스텀 맞춤제작",              type: "custom",   prices: [95000, 78000, 65000],  quantities: [10, 20, 50, 100] },
  { name: "3공바인더 원단형 커스텀",               type: "custom",   prices: [62000, 52000, 44000],  quantities: [10, 20, 30, 50] },
  { name: "PT용바인더 원단형 커스텀",              type: "custom",   prices: [68000, 56000, 46000],  quantities: [10, 20, 30] },
  { name: "하드커버스프링제본 원단형",             type: "custom",   prices: [58000, 48000, 40000],  quantities: [10, 20, 30, 50] },
];

/* ── 배송 방법 풀 (가중치) ── */
const DELIVERY_POOL: DeliveryMethod[] = [
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_COLLECT,
  DeliveryMethod.PICKUP,
  DeliveryMethod.PICKUP,
  DeliveryMethod.QUICK_PREPAID,
];

/* ── 상태 풀 ── */
function statusForDate(date: Date): OrderStatus {
  const now   = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 2)  return pick([OrderStatus.PENDING, OrderStatus.PAID]);
  if (diffDays < 5)  return pick([OrderStatus.PAID, OrderStatus.IN_PRODUCTION]);
  if (diffDays < 12) return pick([OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPING]);
  return pick([OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.SHIPPING]);
}

/* ── 날짜 생성: 월별 6건, 주 2~3회 패턴 ── */
function datesForMonth(year: number, month: number, count: number): Date[] {
  // month: 1-based
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59);

  // 월을 count개 구간으로 나눠서 구간마다 1~2일 랜덤 선택
  const days: number[] = [];
  const step = Math.floor(daysInMonth / count);
  for (let i = 0; i < count; i++) {
    const base = i * step + 1;
    const day  = rand(base, Math.min(base + step - 1, daysInMonth));
    days.push(day);
  }
  // 중복 제거 + 정렬
  const uniqueDays = [...new Set(days)].sort((a, b) => a - b);

  return uniqueDays
    .map((d) => {
      const dt = new Date(year, month - 1, d, rand(8, 20), rand(0, 59));
      return dt;
    })
    .filter((dt) => dt <= cutoff)
    .slice(0, count);
}

/* ── 가격 계산 ── */
function calcPrice(prod: ProductDef, qty: number): number {
  const idx = qty >= 50 ? 2 : qty >= 20 ? 1 : 0;
  return prod.prices[idx] * qty;
}

/* ── 시리얼 생성 ── */
function serial(n: number) {
  return `Pro-${String(n).padStart(4, "0")}`;
}

/* ── 메인 ── */
async function main() {
  console.log("\n🗑  기존 주문 데이터 삭제 중…");
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  console.log("   ✔  완료\n");

  // DB에서 실제 상품 ID 조회 (없으면 임의 productId=1 사용)
  const dbProducts = await prisma.product.findMany({ select: { id: true, name: true }, take: 20 });
  const getFakeProductId = () => (dbProducts.length > 0 ? pick(dbProducts).id : 1);

  const YEAR  = 2026;
  const START_MONTH = 1;
  const TODAY = new Date();
  const END_MONTH = TODAY.getMonth() + 1; // 현재 월

  let orderSeq = 1;
  const ordersToCreate = [];

  for (let m = START_MONTH; m <= END_MONTH; m++) {
    const dates = datesForMonth(YEAR, m, 6);
    for (const date of dates) {
      const prod    = pick(PRODUCTS);
      const qty     = pick(prod.quantities);
      const amount  = calcPrice(prod, qty);
      const delivery = pick(DELIVERY_POOL);
      const shippingFee = delivery === DeliveryMethod.PICKUP ? 0 : (amount >= 30000 ? 0 : 2500);
      const name    = randomName();
      const phone   = randomPhone();
      const email   = randomEmail(name);
      const company = Math.random() > 0.4 ? pick(COMPANIES) : undefined;
      const status  = statusForDate(date);

      ordersToCreate.push({
        serial:         serial(orderSeq++),
        customerName:   name,
        customerPhone:  phone,
        customerEmail:  email,
        company:        company ?? null,
        deliveryMethod: delivery,
        shippingAddress: delivery !== DeliveryMethod.PICKUP
          ? `서울특별시 ${pick(["강남구", "종로구", "마포구", "서초구", "송파구", "영등포구", "중구", "용산구"])} ${rand(1, 999)}번지`
          : null,
        shippingFee,
        totalAmount:    amount + shippingFee,
        status,
        createdAt:      date,
        updatedAt:      date,
        productId:      getFakeProductId(),
        productName:    prod.name,
        quantity:       qty,
        unitPrice:      prod.prices[qty >= 50 ? 2 : qty >= 20 ? 1 : 0],
        subtotal:       amount,
      });
    }
  }

  console.log(`📦  ${ordersToCreate.length}건 주문 삽입 중…\n`);

  for (const o of ordersToCreate) {
    const { productId, productName, quantity, unitPrice, subtotal, ...orderData } = o;
    const created = await prisma.order.create({
      data: {
        ...orderData,
        items: {
          create: [{
            productId,
            productName,
            quantity,
            pageCount: null,
            optionsJson: {},
            unitPrice,
            subtotal,
          }],
        },
      },
    });
    console.log(`   ✔  ${created.serial} | ${created.customerName} | ${productName} x${quantity} | ${created.totalAmount.toLocaleString()}원 | ${created.status}`);
  }

  await prisma.$disconnect();
  console.log(`\n✅ 완료! 총 ${ordersToCreate.length}건 삽입됨`);
}

main().catch((err) => {
  console.error("\n✘ 오류:", err.message ?? err);
  prisma.$disconnect();
  process.exit(1);
});
