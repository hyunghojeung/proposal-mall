import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createInquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  isPrivate: z.boolean().default(false),
  password: z.string().max(50).optional(),
});

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 30), 100);
  const inquiries = await prisma.inquiry.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      name: true,
      isPrivate: true,
      status: true,
      createdAt: true,
      answeredAt: true,
    },
  });
  return NextResponse.json({ inquiries });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const inquiry = await prisma.inquiry.create({ data: parsed.data });
  return NextResponse.json({ inquiry }, { status: 201 });
}
