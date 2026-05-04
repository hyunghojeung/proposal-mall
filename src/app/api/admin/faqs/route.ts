import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  category: z.string().min(1).max(50),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const faq = await prisma.faq.create({ data: parsed.data });
  return NextResponse.json({ faq }, { status: 201 });
}
