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
      className="rounded-sm border border-line px-3 py-1 text-[12px] font-medium text-ink hover:border-ink"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
