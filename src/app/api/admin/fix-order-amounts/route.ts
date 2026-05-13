/**
 * POST /api/admin/fix-order-amounts
 * totalAmount > 3,000,000 인 주문을 300만원 미만 랜덤 금액으로 수정
 * Authorization: Bearer seed-blackcopy-2026
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== "Bearer seed-blackcopy-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 300만원 초과 주문 조회
    const orders = await prisma.order.findMany({
      where: { totalAmount: { gt: 3000000 } },
      select: { id: true, serial: true, totalAmount: true, shippingFee: true },
    });

    const results: string[] = [];

    for (const o of orders) {
      // 50만원 ~ 290만원 사이 랜덤 (10,000원 단위)
      const newAmount = rand(50, 290) * 10000;
      const newTotal  = newAmount + o.shippingFee;

      await prisma.order.update({
        where: { id: o.id },
        data:  { totalAmount: newTotal },
      });

      // order_items subtotal도 함께 수정
      await prisma.orderItem.updateMany({
        where: { orderId: o.id },
        data:  { subtotal: newAmount },
      });

      results.push(`${o.serial}: ${o.totalAmount.toLocaleString()}원 → ${newTotal.toLocaleString()}원`);
    }

    return NextResponse.json({ ok: true, updated: results.length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
