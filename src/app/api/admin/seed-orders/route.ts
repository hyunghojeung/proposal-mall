/**
 * POST /api/admin/seed-orders
 * 가상 주문 데이터 삽입 (기존 전체 삭제 후 재생성)
 * 관리자 전용: Authorization 헤더에 Bearer seed-blackcopy-2026 필요
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeliveryMethod, OrderStatus } from "@prisma/client";

/* ── 유틸 ── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ── 고객 풀 ── */
const LAST  = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "전"];
const FIRST = ["민준", "서연", "도윤", "서현", "예준", "지우", "시우", "서윤", "주원", "하은", "지호", "민서", "준서", "하린", "지원", "수빈", "지훈", "나은", "현우", "다은", "태윤", "채원", "승민", "유나", "정우", "소연", "현진", "보미", "진혁", "아름"];
const COMPANIES = [
  "(주)대한기획", "삼성물산", "현대건설", "LG유플러스", "SK텔레콤", "롯데제과",
  "CJ제일제당", "포스코", "한화솔루션", "KT&G", "신세계그룹", "GS칼텍스",
  "두산중공업", "한국전력", "아모레퍼시픽", "넥슨코리아", "카카오엔터", "네이버클라우드",
  "쿠팡", "배달의민족", "하이브", "크래프톤", "NC소프트", "카카오페이", "토스",
];
const DOMAINS = ["gmail.com", "naver.com", "kakao.com", "daum.net", "nate.com", "outlook.com", "company.co.kr"];
const DISTRICTS = ["강남구", "종로구", "마포구", "서초구", "송파구", "영등포구", "중구", "용산구", "강서구", "관악구", "성동구", "노원구"];

function rName()  { return pick(LAST) + pick(FIRST); }
function rPhone() { return `010-${rand(1000,9999)}-${rand(1000,9999)}`; }
function rEmail(_n: string) {
  const id = ["user", "contact", "order", "mail"][rand(0,3)];
  return `${id}${rand(10,99)}@${pick(DOMAINS)}`;
}

/* ── 상품 정의 ── */
interface Prod { name: string; prices: [number,number,number]; qtys: number[]; }
const PRODUCTS: Prod[] = [
  // 표준형
  { name: "제안서캐리어박스 (표준사이즈)",     prices: [85000,68000,52000], qtys:[5,10,20,30,50] },
  { name: "제안서캐리어박스 표준 A4",          prices: [90000,72000,55000], qtys:[5,10,20,30] },
  { name: "자석박스 표준형",                    prices: [45000,36000,28000], qtys:[10,20,30,50,100] },
  { name: "3공바인더 인쇄형 A4",               prices: [38000,30000,24000], qtys:[10,20,50,100] },
  { name: "PT용바인더 인쇄형",                 prices: [42000,34000,27000], qtys:[10,20,30,50] },
  { name: "하드커버스프링제본 인쇄형",          prices: [35000,28000,22000], qtys:[10,20,30,50,100] },
  // 커스텀
  { name: "제안서캐리어박스 커스텀 맞춤제작",   prices: [185000,155000,125000], qtys:[10,20,30,50] },
  { name: "자석박스 커스텀 맞춤제작",           prices: [95000,78000,65000],  qtys:[10,20,50,100] },
  { name: "3공바인더 원단형 커스텀",            prices: [62000,52000,44000],  qtys:[10,20,30,50] },
  { name: "PT용바인더 원단형 커스텀",           prices: [68000,56000,46000],  qtys:[10,20,30] },
  { name: "하드커버스프링제본 원단형",           prices: [58000,48000,40000],  qtys:[10,20,30,50] },
];

const DELIVERY_POOL: DeliveryMethod[] = [
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_PREPAID,
  DeliveryMethod.COURIER_COLLECT,
  DeliveryMethod.PICKUP,
  DeliveryMethod.PICKUP,
  DeliveryMethod.QUICK_PREPAID,
];

function statusFor(date: Date): OrderStatus {
  const diff = (Date.now() - date.getTime()) / 86400000;
  if (diff < 2)  return pick([OrderStatus.PENDING, OrderStatus.PAID]);
  if (diff < 5)  return pick([OrderStatus.PAID, OrderStatus.IN_PRODUCTION]);
  if (diff < 12) return pick([OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPING]);
  return pick([OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.SHIPPING]);
}

/* ── 월별 날짜 생성 (6건, 주 2~3회 패턴) ── */
function monthDates(year: number, month: number, count: number): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const step = Math.floor(daysInMonth / count);
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = i * step + 1;
    days.push(rand(base, Math.min(base + step - 1, daysInMonth)));
  }
  return [...new Set(days)].sort((a,b) => a-b)
    .map(d => new Date(year, month-1, d, rand(8,20), rand(0,59)))
    .filter(dt => dt <= today)
    .slice(0, count);
}

/* ── API 핸들러 ── */
export async function POST(req: Request) {
  // 간단한 토큰 인증
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== "Bearer seed-blackcopy-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. 기존 전체 삭제
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});

    // 2. 실제 상품 ID 조회
    const dbProds = await prisma.product.findMany({ select: { id: true }, take: 20 });
    const getPid  = () => (dbProds.length > 0 ? pick(dbProds).id : 1);

    const YEAR = 2026;
    const endMonth = new Date().getMonth() + 1;
    let seq = 1;
    const results: string[] = [];

    for (let m = 1; m <= endMonth; m++) {
      const dates = monthDates(YEAR, m, 6);
      for (const date of dates) {
        const prod  = pick(PRODUCTS);
        const qty   = pick(prod.qtys);
        const pIdx  = qty >= 50 ? 2 : qty >= 20 ? 1 : 0;
        const unit  = prod.prices[pIdx];
        const sub   = unit * qty;
        const deliv = pick(DELIVERY_POOL);
        const shipFee = deliv === DeliveryMethod.PICKUP ? 0 : (sub >= 30000 ? 0 : 2500);
        const total = sub + shipFee;
        const name  = rName();
        const phone = rPhone();
        const email = rEmail(name);
        const company = Math.random() > 0.4 ? pick(COMPANIES) : null;
        const serial = `Pro-${String(seq++).padStart(4,"0")}`;

        await prisma.order.create({
          data: {
            serial,
            customerName:   name,
            customerPhone:  phone,
            customerEmail:  email,
            company,
            deliveryMethod: deliv,
            shippingAddress: deliv !== DeliveryMethod.PICKUP
              ? `서울특별시 ${pick(DISTRICTS)} ${rand(1,999)}번지`
              : null,
            shippingFee:  shipFee,
            totalAmount:  total,
            status:       statusFor(date),
            createdAt:    date,
            updatedAt:    date,
            items: {
              create: [{
                productId:   getPid(),
                productName: prod.name,
                quantity:    qty,
                pageCount:   null,
                optionsJson: {},
                unitPrice:   unit,
                subtotal:    sub,
              }],
            },
          },
        });
        results.push(`${serial} | ${name} | ${prod.name} x${qty} | ${total.toLocaleString()}원`);
      }
    }

    return NextResponse.json({ ok: true, count: results.length, orders: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
