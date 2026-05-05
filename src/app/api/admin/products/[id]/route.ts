import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const optionValueSchema = z.object({
  label: z.string().min(1).max(60),
  priceDelta: z.number().int().default(0),
  sortOrder: z.number().int().default(0),
});
const optionGroupSchema = z.object({
  name: z.string().min(1).max(60),
  required: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  values: z.array(optionValueSchema).default([]),
});
const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string().max(5000) }),
  z.object({ type: z.literal("image"), url: z.string().url(), caption: z.string().max(200).default("") }),
]);

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  binding: z.nativeEnum(BindingType).optional(),
  paper: z.nativeEnum(PaperType).optional(),
  description: z.string().max(2000).nullable().optional(),
  thumbnail: z.string().url().nullable().optional().or(z.literal("")),
  images: z.array(z.string().url()).optional(),
  contentBlocks: z.array(contentBlockSchema).optional(),
  basePrice: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  optionGroups: z.array(optionGroupSchema).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { optionGroups, thumbnail, images, contentBlocks, ...rest } = parsed.data;

  // 이미지 배열이 있으면 thumbnail도 첫 번째 이미지로 자동 동기화
  const derivedThumbnail = images ? (images[0] ?? null) : thumbnail;

  const updated = await prisma.$transaction(async (tx) => {
    if (optionGroups) {
      await tx.optionGroup.deleteMany({ where: { productId: id } });
      for (let gi = 0; gi < optionGroups.length; gi++) {
        const g = optionGroups[gi];
        await tx.optionGroup.create({
          data: {
            productId: id,
            name: g.name,
            required: g.required,
            sortOrder: g.sortOrder ?? gi,
            values: {
              create: g.values.map((v, vi) => ({
                label: v.label,
                priceDelta: v.priceDelta,
                sortOrder: v.sortOrder ?? vi,
              })),
            },
          },
        });
      }
    }
    return tx.product.update({
      where: { id },
      data: {
        ...rest,
        ...(images !== undefined ? { images, thumbnail: derivedThumbnail } : {}),
        ...(contentBlocks !== undefined ? { contentBlocks } : {}),
        ...(thumbnail !== undefined && images === undefined
          ? { thumbnail: thumbnail || null }
          : {}),
      },
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { values: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message: "주문 이력이 있어 삭제 대신 비활성 처리되었습니다.",
    });
  }
}
