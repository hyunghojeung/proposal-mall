import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 사이다페이 서버→서버 콜백 (feedbackurl).
// GET / POST 둘 다 지원 (사이다페이 정책에 따라 방식이 다를 수 있음).
async function handleWebhook(req: NextRequest) {
  const adapter = getPaymentAdapter();

  let rawBody: string;
  if (req.method === "POST") {
    rawBody = await req.text();
  } else {
    // GET 방식 콜백
    rawBody = req.nextUrl.searchParams.toString();
  }

  // 사이다페이는 별도 HMAC 서명 없이 body 전송 → verifyWebhook은 always valid
  const verification = adapter.verifyWebhook(rawBody, null);
  if (!verification.valid || !verification.payload) {
    console.error("[webhook] 파싱 실패:", rawBody);
    return NextResponse.json({ error: "parse error" }, { status: 400 });
  }

  const { orderSerial, status, tid, amount } = verification.payload;
  console.log("[webhook] 수신:", { orderSerial, status, tid, amount });

  if (!orderSerial) {
    return NextResponse.json({ error: "missing orderSerial" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { serial: orderSerial } });
  if (!order) {
    console.error("[webhook] 주문 없음:", orderSerial);
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // 금액 검증
  if (typeof amount === "number" && amount !== order.totalAmount) {
    console.error("[webhook] 금액 불일치:", { expected: order.totalAmount, received: amount });
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  if (status === "success" && order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentTid: tid },
      include: { items: true },
    });
    await sendOrderConfirmation(updated);
    console.log("[webhook] 결제 완료:", orderSerial, tid);
  } else if (status === "failed" || status === "cancelled") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    console.log("[webhook] 결제 실패/취소:", orderSerial, status);
  }

  return NextResponse.json({ ok: true });
}

export const GET = handleWebhook;
export const POST = handleWebhook;
