import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 결제 완료 후 사이다페이가 사용자 브라우저를 이 URL로 리다이렉트
// returnmode=JUST → GET 요청으로 호출됨
// returnurl 에 ?order=Pro-0001 를 넣었으므로 쿼리파라미터로 주문번호 식별
async function handleReturn(req: NextRequest) {
  const adapter = getPaymentAdapter();
  const origin = req.nextUrl.origin;

  let params: URLSearchParams;
  if (req.method === "POST") {
    // 혹시 POST로 오는 경우 대비
    const text = await req.text();
    params = new URLSearchParams(text);
    // returnurl의 쿼리파라미터도 병합
    req.nextUrl.searchParams.forEach((v, k) => params.set(k, v));
  } else {
    params = req.nextUrl.searchParams;
  }

  const result = adapter.parseReturn(params);

  if (!result.orderSerial) {
    return NextResponse.redirect(`${origin}/checkout?fail=missing-order`);
  }

  if (result.status === "cancelled") {
    return NextResponse.redirect(`${origin}/checkout?fail=cancelled`);
  }

  if (result.status === "failed") {
    return NextResponse.redirect(
      `${origin}/checkout?fail=${encodeURIComponent(result.errorMessage ?? "failed")}`,
    );
  }

  const order = await prisma.order.findUnique({
    where: { serial: result.orderSerial },
  });
  if (!order) {
    return NextResponse.redirect(`${origin}/checkout?fail=order-not-found`);
  }

  // feedback(webhook)이 먼저 도착해서 이미 PAID일 수 있음 — 중복 처리 방지
  if (order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentTid: result.tid,
      },
      include: { items: true },
    });
    await sendOrderConfirmation(updated);
  }

  return NextResponse.redirect(`${origin}/orders/${order.serial}?paid=1`);
}

export const GET = handleReturn;
export const POST = handleReturn;
