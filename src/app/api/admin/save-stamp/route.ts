import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* settings 테이블 자동 생성 (Railway에서 최초 1회) */
async function ensureSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type || "image/png"};base64,${base64}`;

    await ensureSettingsTable();

    await prisma.$executeRawUnsafe(`
      INSERT INTO settings (key, value, "updatedAt")
      VALUES ('stamp_image', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()
    `, dataUrl);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[save-stamp]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
