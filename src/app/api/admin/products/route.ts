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

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "소문자/숫자/하이픈만 사용"),
  name: z.string().min(1).max(120),
  category: z.nativeEnum(ProductCategory),
  binding: z.nativeEnum(BindingType).default(BindingType.NONE),
  paper: z.nativeEnum(PaperType).default(PaperType.NONE),
  description: z.string().max(2000).optional(),
  thumbnail: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  optionGroups: z.array(optionGroupSchema).default([]),
});

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { optionGroups, thumbnail, ...rest } = parsed.data;
  try {
    const product = await prisma.product.create({
      data: {
        ...rest,
        thumbnail: thumbnail || null,
        optionGroups: {
          create: optionGroups.map((g, i) => ({
            name: g.name,
            required: g.required,
            sortOrder: g.sortOrder ?? i,
            values: {
              create: g.values.map((v, vi) => ({
                label: v.label,
                priceDelta: v.priceDelta,
                sortOrder: v.sortOrder ?? vi,
              })),
            },
          })),
        },
      },
      include: { optionGroups: { include: { values: true } } },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create failed";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json({ error: "slug 중복" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
