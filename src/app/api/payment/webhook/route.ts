import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PG 서버-서버 알림. 사용자 리다이렉트와 별개로 안전하게 결제 결과를 확정.
// 사이다페이는 X-Cidapay-Signature 같은 헤더에 HMAC을 넣는 것으로 가정 — 실제 매뉴얼에 맞게 조정.
export async function POST(req: NextRequest) {
  const adapter = getPaymentAdapter();
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-cidapay-signature") ?? req.headers.get("x-signature");

  const verification = adapter.verifyWebhook(rawBody, signature);
  if (!verification.valid || !verification.payload) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const { orderSerial, status, tid, amount } = verification.payload;
  const order = await prisma.order.findUnique({ where: { serial: orderSerial } });
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  if (typeof amount === "number" && amount !== order.totalAmount) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  if (status === "success" && order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paymentTid: tid },
      include: { items: true },
    });
    await sendOrderConfirmation(updated);
  }

  return NextResponse.json({ ok: true });
}
