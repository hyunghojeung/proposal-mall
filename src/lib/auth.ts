import { cookies } from "next/headers";

const SESSION_COOKIE = "admin_session";

export function isAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  return token === process.env.ADMIN_SESSION_SECRET;
}

export function isAdminAuthenticated() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return isAdminSessionToken(token);
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE;
