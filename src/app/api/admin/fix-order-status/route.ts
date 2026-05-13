/**
 * POST /api/admin/fix-order-status
 * 전체 주문 상태를 DELIVERED(배송완료)로 일괄 변경
 * Authorization: Bearer seed-blackcopy-2026
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== "Bearer seed-blackcopy-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.order.updateMany({
      data: { status: OrderStatus.DELIVERED },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
