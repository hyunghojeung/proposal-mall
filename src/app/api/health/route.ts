import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Railway 헬스체크 + 운영 모니터링용.
// DB 연결까지 확인해서 503으로 마킹되면 Railway가 재시작/롤백.
export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "fail" = "ok";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    db = "fail";
    dbError = err instanceof Error ? err.message : String(err);
  }

  const body = {
    ok: db === "ok",
    db,
    dbError,
    uptimeMs: Math.round(process.uptime() * 1000),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: db === "ok" ? 200 : 503 });
}
