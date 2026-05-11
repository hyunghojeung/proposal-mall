import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const password = req.nextUrl.searchParams.get("password") ?? "";

  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });

  // 비밀번호 검증: 설정된 경우만 체크
  if (inquiry.password && inquiry.password !== password) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  return NextResponse.json({
    inquiry: {
      id:         inquiry.id,
      subject:    inquiry.subject,
      message:    inquiry.message,
      answer:     inquiry.answer,
      answeredAt: inquiry.answeredAt,
      status:     inquiry.status,
      createdAt:  inquiry.createdAt,
      name:       inquiry.name,
    },
  });
}
