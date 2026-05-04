import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  isPinned: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const notice = await prisma.notice.create({ data: parsed.data });
  return NextResponse.json({ notice }, { status: 201 });
}
