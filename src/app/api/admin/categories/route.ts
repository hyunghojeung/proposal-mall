import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_ENUM_KEYS = [
  "CARRIER_BOX", "MAGNETIC_BOX", "BINDING_3_RING",
  "BINDING_PT", "BINDING_HARDCOVER", "PAPER_INNER",
] as const;

const createSchema = z.object({
  enumKey:     z.enum(VALID_ENUM_KEYS),
  slug:        z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  label:       z.string().min(1).max(60),
  description: z.string().max(300).default(""),
  sortOrder:   z.number().int().default(0),
  isActive:    z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const rows = await prisma.categoryConfig.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });

  try {
    const row = await prisma.categoryConfig.create({ data: parsed.data });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.includes("Unique") || msg.includes("unique"))
      return NextResponse.json({ error: "이미 등록된 카테고리입니다" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
