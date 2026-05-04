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

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  binding: z.nativeEnum(BindingType).optional(),
  paper: z.nativeEnum(PaperType).optional(),
  description: z.string().max(2000).nullable().optional(),
  thumbnail: z.string().url().nullable().optional().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  // 전체 옵션 그룹 교체 — null이면 변경 안함
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
  const { optionGroups, thumbnail, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (optionGroups) {
      // 기존 그룹/값 모두 삭제 후 새로 생성 (옵션 라벨이 주문 스냅샷에 이미 저장돼 있으므로 안전)
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
        ...(thumbnail !== undefined ? { thumbnail: thumbnail || null } : {}),
      },
      include: { optionGroups: { include: { values: true } } },
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
  // 주문 이력이 있으면 FK 보호 위반 — 비활성으로 전환만 권장
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    // 비활성 처리로 fallback
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message: "주문 이력이 있어 삭제 대신 비활성 처리되었습니다.",
    });
  }
}
