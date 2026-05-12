import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagrams = await prisma.diagram.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      fileName: true,
      fileSize: true,
      downloadCount: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ diagrams });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  category: z.string().max(100).default(""),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1).max(200),
  fileSize: z.string().max(50).default(""),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }
  const diagram = await prisma.diagram.create({ data: parsed.data });
  return NextResponse.json({ diagram }, { status: 201 });
}
