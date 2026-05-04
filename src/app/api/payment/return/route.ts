import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 결제 완료 후 PG가 사용자를 이 URL로 리다이렉트.
// 성공 시: 주문 상태를 PAID로 갱신 후 /orders/[serial] 로 이동.
// 실패/취소 시: /checkout?fail=... 로 이동.
export async function GET(req: NextRequest) {
  const adapter = getPaymentAdapter();
  const result = adapter.parseReturn(req.nextUrl.searchParams);
  const origin = req.nextUrl.origin;

  if (!result.orderSerial) {
    return NextResponse.redirect(`${origin}/checkout?fail=missing-order`);
  }

  if (result.status !== "success") {
    return NextResponse.redirect(
      `${origin}/checkout?fail=${encodeURIComponent(result.status)}`,
    );
  }

  const order = await prisma.order.findUnique({
    where: { serial: result.orderSerial },
  });
  if (!order) {
    return NextResponse.redirect(`${origin}/checkout?fail=order-not-found`);
  }

  // 금액 검증 — 변조 방지
  if (typeof result.amount === "number" && result.amount !== order.totalAmount) {
    return NextResponse.redirect(`${origin}/checkout?fail=amount-mismatch`);
  }

  if (order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentTid: result.tid,
      },
      include: { items: true },
    });
    // Best-effort: Dropbox link + 안내 메일. 실패해도 결제는 이미 확정됨.
    await sendOrderConfirmation(updated);
  }

  return NextResponse.redirect(`${origin}/orders/${order.serial}?paid=1`);
}
