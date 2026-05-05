import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get("cat");
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(cat ? { category: cat as never } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return NextResponse.json({ products });
}
