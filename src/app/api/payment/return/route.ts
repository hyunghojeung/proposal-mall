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

  // Railway 리버스 프록시에서 origin 이 localhost:8080 으로 오는 문제 방지
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost  = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin   = siteUrl ?? (fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin);

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

  // 수신 파라미터 전체 로그 (디버깅용)
  console.log("[payment/return] 수신 파라미터:", Object.fromEntries(params.entries()));

  try {
    const result = adapter.parseReturn(params);
    console.log("[payment/return] 파싱 결과:", result);

    if (!result.orderSerial) {
      console.warn("[payment/return] orderSerial 없음");
      return NextResponse.redirect(`${origin}/checkout?fail=missing-order`);
    }

    if (result.status === "cancelled" || result.status === "failed") {
      console.warn("[payment/return] 결제 취소/실패:", result.status, result.errorMessage);
      const p = new URLSearchParams({
        status: result.status,
        msg: result.errorMessage ?? "",
      });
      return NextResponse.redirect(`${origin}/payment/complete?${p}`);
    }

    const order = await prisma.order.findUnique({
      where: { serial: result.orderSerial },
    });
    if (!order) {
      console.error("[payment/return] 주문 없음:", result.orderSerial);
      return NextResponse.redirect(`${origin}/checkout?fail=order-not-found`);
    }

    // feedback(webhook)이 먼저 도착해서 이미 PAID일 수 있음 — 중복 처리 방지
    if (order.status === "PENDING") {
      try {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentTid: result.tid,
          },
          include: { items: true },
        });
        await sendOrderConfirmation(updated);
      } catch (updateErr) {
        console.error("[payment/return] 주문 업데이트 실패:", updateErr);
        // 업데이트 실패해도 완료 페이지로 이동 (결제는 됐을 가능성)
      }
    }

    // 팝업 창에서 호출되는 경우 → 결제완료 팝업 페이지로 이동
    // 팝업 닫힘 감지 시 부모 창이 /orders/{serial}?paid=1 로 이동
    const completeParams = new URLSearchParams({
      serial: order.serial,
      amount: String(order.totalAmount),
      status: "success",
    });
    return NextResponse.redirect(`${origin}/payment/complete?${completeParams}`);

  } catch (err) {
    console.error("[payment/return] 처리 오류:", err);
    // DB 연결 오류 등 — 주문번호가 있으면 완료 페이지로, 없으면 체크아웃으로
    const serial = params.get("order") ?? params.get("orderSerial") ?? "";
    if (serial) {
      const p = new URLSearchParams({ serial, status: "success" });
      return NextResponse.redirect(`${origin}/payment/complete?${p}`);
    }
    return NextResponse.redirect(`${origin}/checkout?fail=server-error`);
  }
}

export const GET = handleReturn;
export const POST = handleReturn;
