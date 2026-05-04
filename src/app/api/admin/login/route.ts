import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  // 간단 비교 — 운영 시 bcrypt 해시 검증으로 교체
  const expected = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD_HASH;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.json(
      { error: "ADMIN_SESSION_SECRET not configured" },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
