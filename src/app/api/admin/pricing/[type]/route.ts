import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";
import {
  parsePaper,
  parseBinding,
  parseBox,
  serializePaper,
  serializeBinding,
  serializeBox,
} from "@/lib/pricing-excel";

export const dynamic = "force-dynamic";

const FILENAME: Record<string, string> = {
  paper: "pricing-paper.xlsx",
  binding: "pricing-binding.xlsx",
  box: "pricing-box.xlsx",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const t = params.type;
  let buf: Buffer;
  if (t === "paper") {
    const rows = await prisma.pricePaper.findMany({
      orderBy: [{ paper: "asc" }, { pageCount: "asc" }, { qtyTier: "asc" }],
    });
    buf = serializePaper(rows);
  } else if (t === "binding") {
    const rows = await prisma.priceBinding.findMany({
      orderBy: [{ binding: "asc" }, { variant: "asc" }, { qtyTier: "asc" }],
    });
    buf = serializeBinding(rows);
  } else if (t === "box") {
    const rows = await prisma.priceBox.findMany({
      orderBy: [{ category: "asc" }, { variant: "asc" }, { qtyTier: "asc" }],
    });
    buf = serializeBox(rows);
  } else {
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${FILENAME[t]}"`,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { type: string } },
) {
  if (!isAdminRequest(req)) return adminUnauthorized();
  const t = params.type;
  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  try {
    if (t === "paper") {
      const rows = parsePaper(arrayBuffer);
      const written = await prisma.$transaction(async (tx) => {
        await tx.pricePaper.deleteMany({});
        await tx.pricePaper.createMany({ data: rows });
        return rows.length;
      });
      return NextResponse.json({ ok: true, written });
    }
    if (t === "binding") {
      const rows = parseBinding(arrayBuffer);
      const written = await prisma.$transaction(async (tx) => {
        await tx.priceBinding.deleteMany({});
        await tx.priceBinding.createMany({ data: rows });
        return rows.length;
      });
      return NextResponse.json({ ok: true, written });
    }
    if (t === "box") {
      const rows = parseBox(arrayBuffer);
      const written = await prisma.$transaction(async (tx) => {
        await tx.priceBox.deleteMany({});
        await tx.priceBox.createMany({ data: rows });
        return rows.length;
      });
      return NextResponse.json({ ok: true, written });
    }
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "parse failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
