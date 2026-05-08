import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { serial: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const order = await prisma.order
    .findUnique({ where: { serial: params.serial }, include: { items: true } })
    .catch(() => null);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // BigInt → number 직렬화
  const serialized = {
    ...order,
    totalAmount:  Number(order.totalAmount),
    shippingFee:  Number(order.shippingFee),
    createdAt:    order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      ...it,
      unitPrice: Number(it.unitPrice),
      subtotal:  Number(it.subtotal),
    })),
  };
  return NextResponse.json({ order: serialized });
}

const patchSchema = z.object({
  status: z
    .enum(["PENDING", "PAID", "IN_PRODUCTION", "SHIPPING", "DELIVERED", "CANCELLED"])
    .optional(),
  memo: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { serial: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const order = await prisma.order.update({
    where: { serial: params.serial },
    data: parsed.data,
  });
  return NextResponse.json({ order });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { serial: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  try {
    // 주문 상품 먼저 삭제 후 주문 삭제
    await prisma.orderItem.deleteMany({ where: { order: { serial: params.serial } } });
    await prisma.order.delete({ where: { serial: params.serial } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/orders] 삭제 실패:", e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
