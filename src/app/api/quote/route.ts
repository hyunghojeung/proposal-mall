import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateQuote } from "@/lib/quote";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  slug: z.string().min(1),
  options: z.record(z.string(), z.string()).default({}),
  quantity: z.number().int().positive().max(10000),
  pageCount: z.number().int().positive().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { slug, options, quantity, pageCount } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { optionGroups: { include: { values: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    const result = await calculateQuote({ product, options, quantity, pageCount });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "가격 계산 실패";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
