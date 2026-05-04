import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(20000).optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const notice = await prisma.notice.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ notice });
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
  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
