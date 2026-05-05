import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}
