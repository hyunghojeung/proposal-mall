import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 결제 완료 여부 폴링용 경량 엔드포인트
// CheckoutForm이 2초마다 호출해서 주문 상태가 PAID가 됐는지 확인
export async function GET(
  _req: NextRequest,
  { params }: { params: { serial: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { serial: params.serial },
      select: { status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ status: order.status });
  } catch {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
