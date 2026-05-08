"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      // router.push 대신 하드 네비게이션 — Next.js 라우터 캐시(prefetch) 우회
      // 쿠키가 확실히 세팅된 상태로 서버에 새 요청을 보내기 위함
      window.location.href = "/admin";
      return;
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(data?.error ?? "로그인 실패");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded border border-line bg-white p-8 shadow-sm"
      >
        <h1 className="text-[20px] font-black text-ink">관리자 로그인</h1>
        <p className="mt-1 text-[13px] text-ink-sub">제안서박스몰 관리 패널</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand"
          />
        </label>

        {err && <p className="mt-3 text-[13px] text-brand">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-sm bg-brand py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "확인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
