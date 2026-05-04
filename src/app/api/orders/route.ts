import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatOrderSerial, shippingFee } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  pageCount: z.number().int().nonnegative().optional(),
  optionsJson: z.record(z.string(), z.unknown()).default({}),
  unitPrice: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(40),
  customerEmail: z.string().email(),
  company: z.string().max(100).optional(),
  deliveryMethod: z.enum(["COURIER", "PICKUP"]),
  shippingAddress: z.string().max(500).optional(),
  memo: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  // 주문현황은 실시간 공개 — 마스킹된 형태로 반환
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      serial: true,
      customerName: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  });
  // 이름 마스킹 (예: 홍길동 → 홍*동)
  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      customerName: maskName(o.customerName),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const subtotal = data.items.reduce((s, it) => s + it.subtotal, 0);
  const fee = shippingFee(subtotal, data.deliveryMethod);
  const total = subtotal + fee;

  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const nextSeq = (last?.id ?? 0) + 1;
    return tx.order.create({
      data: {
        serial: formatOrderSerial(nextSeq),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        company: data.company,
        deliveryMethod: data.deliveryMethod,
        shippingAddress: data.shippingAddress,
        shippingFee: fee,
        totalAmount: total,
        memo: data.memo,
        items: {
          create: data.items.map<Prisma.OrderItemCreateWithoutOrderInput>((it) => ({
            product: { connect: { id: it.productId } },
            productName: it.productName,
            quantity: it.quantity,
            pageCount: it.pageCount,
            optionsJson: it.optionsJson as Prisma.InputJsonValue,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
          })),
        },
      },
      include: { items: true },
    });
  });

  return NextResponse.json({ order }, { status: 201 });
}

function maskName(name: string) {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name.at(-1);
}
