import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT value FROM settings WHERE key = 'stamp_image' LIMIT 1`
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    return NextResponse.json({ ok: true, dataUrl: rows[0].value });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
