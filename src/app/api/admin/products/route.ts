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

const featureItemSchema = z.object({
  icon:  z.string().max(100).default(""),
  title: z.string().max(200).default(""),
  desc:  z.string().max(2000).default(""),
});
const imageGridItemSchema = z.object({
  imageUrl: z.string().default(""),
  title:    z.string().max(200).default(""),
  desc:     z.string().max(2000).default(""),
});

const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"),    content: z.string().max(5000) }),
  z.object({ type: z.literal("image"),   url: z.string().url(), caption: z.string().max(200).default("") }),
  z.object({ type: z.literal("image_text"),
    imageUrl:      z.string().default(""),
    imagePosition: z.enum(["left", "right"]).default("left"),
    title:         z.string().max(200).default(""),
    content:       z.string().max(5000).default(""),
  }),
  z.object({ type: z.literal("feature_grid"),
    heading: z.string().max(200).default(""),
    columns: z.union([z.literal(2), z.literal(3)]).default(3),
    items:   z.array(featureItemSchema).default([]),
  }),
  z.object({ type: z.literal("image_grid"),
    heading: z.string().max(200).default(""),
    columns: z.union([z.literal(2), z.literal(3)]).default(2),
    items:   z.array(imageGridItemSchema).default([]),
  }),
  z.object({ type: z.literal("banner"),
    imageUrl: z.string().default(""),
    title:    z.string().max(200).default(""),
    subtitle: z.string().max(500).default(""),
    align:    z.enum(["left", "center"]).default("center"),
  }),
  z.object({ type: z.literal("divider"), label: z.string().max(100).default("") }),
]);

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
  thumbnail: z.string().url().optional().or(z.literal("")).optional(),
  images: z.array(z.string().url()).default([]),
  contentBlocks: z.array(contentBlockSchema).default([]),
  basePrice: z.number().int().min(0).default(0),
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
  const { optionGroups, thumbnail, images, contentBlocks, ...rest } = parsed.data;
  const derivedThumbnail = images[0] ?? thumbnail ?? null;
  try {
    const product = await prisma.product.create({
      data: {
        ...rest,
        thumbnail: derivedThumbnail || null,
        images,
        contentBlocks,
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
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { values: { orderBy: { sortOrder: "asc" } } },
        },
      },
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
