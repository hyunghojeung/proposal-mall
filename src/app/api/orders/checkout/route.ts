import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/lib/quote";
import { formatOrderSerial, shippingFee } from "@/lib/pricing";
import { getPaymentAdapter } from "@/lib/payment";

export const dynamic = "force-dynamic";

const cartItemSchema = z.object({
  slug: z.string().min(1),
  options: z.record(z.string(), z.string()).default({}),
  quantity: z.number().int().positive().max(10000),
  pageCount: z.number().int().positive().max(2000).optional(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(40),
  customerEmail: z.string().email(),
  company: z.string().max(100).optional(),
  deliveryMethod: z.enum(["COURIER_PREPAID", "COURIER_COLLECT", "QUICK_PREPAID", "QUICK_COLLECT", "PICKUP"]),
  shippingAddress: z.string().max(500).optional(),
  memo: z.string().max(2000).optional(),
  items: z.array(cartItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const needsAddress = data.deliveryMethod === "COURIER_PREPAID" || data.deliveryMethod === "COURIER_COLLECT";
  if (needsAddress && !data.shippingAddress?.trim()) {
    return NextResponse.json(
      { error: "택배 배송은 배송지 주소가 필요합니다" },
      { status: 400 },
    );
  }

  // 서버 사이드에서 가격 재계산 — 클라이언트 스냅샷은 신뢰하지 않는다
  const recalculated: {
    productId: number;
    productName: string;
    quantity: number;
    pageCount?: number;
    optionsJson: Record<string, string>;
    unitPrice: number;
    subtotal: number;
  }[] = [];

  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { slug: item.slug },
      include: { optionGroups: { include: { values: true } } },
    });
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: `상품을 찾을 수 없습니다: ${item.slug}` },
        { status: 404 },
      );
    }
    try {
      const quote = await calculateQuote({
        product,
        options: item.options,
        quantity: item.quantity,
        pageCount: item.pageCount,
      });
      recalculated.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        pageCount: item.pageCount,
        optionsJson: item.options,
        unitPrice: quote.unitPrice,
        subtotal: quote.subtotal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "가격 계산 실패";
      return NextResponse.json(
        { error: `${product.name}: ${message}` },
        { status: 422 },
      );
    }
  }

  const subtotal = recalculated.reduce((s, it) => s + it.subtotal, 0);
  const fee = shippingFee(subtotal, data.deliveryMethod);
  const total = subtotal + fee;

  // 주문 생성 (PENDING)
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
          create: recalculated.map<Prisma.OrderItemCreateWithoutOrderInput>((it) => ({
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

  // PG 결제 초기화
  const adapter = getPaymentAdapter();
  const origin = req.nextUrl.origin;
  let paymentInit;
  try {
    paymentInit = await adapter.init({
      orderSerial: order.serial,
      amount: order.totalAmount,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      productName: `제안서몰 주문 (${order.items.length}건)`,
      returnUrl: `${origin}/api/payment/return`,
      notifyUrl: `${origin}/api/payment/webhook`,
    });
  } catch (pgErr) {
    const msg = pgErr instanceof Error ? pgErr.message : "결제 초기화 실패";
    console.error("[checkout] PG 초기화 오류:", msg);
    return NextResponse.json({ error: `결제 오류: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({
    order: {
      serial: order.serial,
      totalAmount: order.totalAmount,
      shippingFee: order.shippingFee,
      itemCount: order.items.length,
    },
    payment: {
      adapter: adapter.name,
      ...paymentInit,
    },
  });
}
