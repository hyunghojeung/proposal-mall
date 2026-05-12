import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  fileUrl: z.string().min(1).optional(),
  fileName: z.string().min(1).max(200).optional(),
  fileSize: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const diagram = await prisma.diagram.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ diagram });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.diagram.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// POST: 다운로드 횟수 증가 + fileUrl 반환
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const diagram = await prisma.diagram.findUnique({ where: { id } });
  if (!diagram || !diagram.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.diagram.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.json({ fileUrl: diagram.fileUrl });
}
