import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  answer: z.string().max(5000).optional(),
  status: z.enum(["OPEN", "ANSWERED", "CLOSED"]).optional(),
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
  const data: {
    answer?: string;
    status?: "OPEN" | "ANSWERED" | "CLOSED";
    answeredAt?: Date;
  } = { ...parsed.data };
  if (parsed.data.answer !== undefined && parsed.data.answer.trim().length > 0) {
    data.answeredAt = new Date();
    if (!parsed.data.status) data.status = "ANSWERED";
  }
  const inquiry = await prisma.inquiry.update({ where: { id }, data });
  return NextResponse.json({ inquiry });
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
  await prisma.inquiry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
