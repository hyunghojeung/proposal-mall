import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { serial: string } },
) {
  const body = await req.json().catch(() => null);
  const name  = (body?.name  as string | undefined)?.trim() ?? "";
  const phone = (body?.phone as string | undefined)?.replace(/[^0-9]/g, "") ?? "";

  if (!name || !phone) {
    return NextResponse.json({ error: "이름과 전화번호를 모두 입력해주세요." }, { status: 400 });
  }

  const order = await prisma.order
    .findUnique({
      where:  { serial: params.serial },
      select: { customerName: true, customerPhone: true },
    })
    .catch(() => null);

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const orderPhone = order.customerPhone.replace(/[^0-9]/g, "");
  const nameMatch  = order.customerName.trim() === name;
  const phoneMatch = orderPhone === phone;

  if (!nameMatch || !phoneMatch) {
    return NextResponse.json({ error: "이름 또는 전화번호가 일치하지 않습니다." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
