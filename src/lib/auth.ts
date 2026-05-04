import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";

export function isAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  return token === process.env.ADMIN_SESSION_SECRET;
}

export function isAdminAuthenticated() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return isAdminSessionToken(token);
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return isAdminSessionToken(token);
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE;
