"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.push("/admin/login");
          router.refresh();
        })
      }
      className="rounded border border-line px-4 py-2 text-[16px] font-medium text-ink hover:border-ink"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
