import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 결제 완료 후 사이다페이가 사용자 브라우저를 이 URL로 리다이렉트 (GET 또는 POST).
// returnmode="POST" 이므로 POST body에 파라미터가 담겨올 수 있다.
async function handleReturn(req: NextRequest) {
  const adapter = getPaymentAdapter();
  const origin = req.nextUrl.origin;

  // GET: query string / POST: form body 둘 다 지원
  let params: URLSearchParams;
  if (req.method === "POST") {
    const text = await req.text();
    params = new URLSearchParams(text);
    // JSON으로 왔을 경우 대비
    if (text.startsWith("{")) {
      try {
        const obj = JSON.parse(text) as Record<string, string>;
        params = new URLSearchParams(Object.entries(obj).map(([k, v]) => [k, String(v)]));
      } catch {
        // 그대로 사용
      }
    }
  } else {
    params = req.nextUrl.searchParams;
  }

  const result = adapter.parseReturn(params);

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

  // PENDING → PAID (중복 처리 방지)
  if (order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentTid: result.tid,
      },
      include: { items: true },
    });
    // best-effort: 이메일/Dropbox 알림
    await sendOrderConfirmation(updated);
  }

  return NextResponse.redirect(`${origin}/orders/${order.serial}?paid=1`);
}

export const GET = handleReturn;
export const POST = handleReturn;
