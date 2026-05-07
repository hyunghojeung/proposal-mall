import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// 사이다페이 서버→서버 feedback 콜백 (feedbackurl)
// 공식 문서 Feedback 필드:
//   var1          → 주문번호 (우리가 var1에 orderSerial을 넣었음)
//   paymentState  → COMPLETE | CANCEL
//   orderNo       → 사이다페이 주문번호 (tid로 저장)
//   feedbackToken → 결제 취소 시 token으로 사용
//   price         → 결제 금액
//   approvalNo    → 카드 승인번호
//   ccname        → 카드사명
//   payType       → 1:카드 2:핸드폰 3:카카오페이
async function handleWebhook(req: NextRequest) {
  const adapter = getPaymentAdapter();

  let rawBody: string;
  if (req.method === "POST") {
    rawBody = await req.text();
  } else {
    rawBody = req.nextUrl.searchParams.toString();
  }

  console.log("[ciderpay-webhook] 수신:", rawBody.substring(0, 200));

  const verification = adapter.verifyWebhook(rawBody, null);
  if (!verification.valid || !verification.payload) {
    console.error("[ciderpay-webhook] 파싱 실패");
    return NextResponse.json({ error: "parse error" }, { status: 400 });
  }

  const { orderSerial, status, tid, amount } = verification.payload;

  // feedbackToken 파싱 (rawBody에서 직접 추출 — 취소 시 필요)
  let feedbackToken: string | undefined;
  try {
    const data: Record<string, string> = rawBody.startsWith("{")
      ? (JSON.parse(rawBody) as Record<string, string>)
      : Object.fromEntries(new URLSearchParams(rawBody));
    feedbackToken = data.feedbackToken ?? undefined;
  } catch {
    // 무시
  }

  console.log("[ciderpay-webhook] 처리:", { orderSerial, status, tid, amount, feedbackToken: feedbackToken ? "있음" : "없음" });

  if (!orderSerial) {
    return NextResponse.json({ error: "missing var1 (orderSerial)" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { serial: orderSerial } });
  if (!order) {
    console.error("[ciderpay-webhook] 주문 없음:", orderSerial);
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // 금액 검증 (변조 방지)
  if (typeof amount === "number" && amount !== order.totalAmount) {
    console.error("[ciderpay-webhook] 금액 불일치:", { expected: order.totalAmount, received: amount });
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  if (status === "success" && order.status === "PENDING") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentTid: tid,
        ...(feedbackToken && { paymentFeedbackToken: feedbackToken }),
      },
      include: { items: true },
    });
    await sendOrderConfirmation(updated);
    console.log("[ciderpay-webhook] 결제완료:", orderSerial);

  } else if ((status === "failed" || status === "cancelled") && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    console.log("[ciderpay-webhook] 결제실패/취소:", orderSerial, status);
  }

  // 사이다페이는 200 OK 응답을 기대함
  return NextResponse.json({ ok: true });
}

export const GET = handleWebhook;
export const POST = handleWebhook;
