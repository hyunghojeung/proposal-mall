"use client";

import { useState, useEffect } from "react";

interface Props {
  serial: string;
  skipVerify?: boolean;   // 결제 직후(paid=1)나 checking=1 시 건너뜀
  children: React.ReactNode;
}

const SESSION_KEY = (serial: string) => `order_verified_${serial}`;

export function OrderVerifyGate({ serial, skipVerify, children }: Props) {
  const [verified, setVerified] = useState(false);
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  /* 세션스토리지로 새로고침 시 재인증 방지 */
  useEffect(() => {
    if (skipVerify) { setVerified(true); return; }
    try {
      if (sessionStorage.getItem(SESSION_KEY(serial)) === "1") setVerified(true);
    } catch { /* 무시 */ }
  }, [serial, skipVerify]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${serial}/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "인증에 실패했습니다.");
        return;
      }
      try { sessionStorage.setItem(SESSION_KEY(serial), "1"); } catch { /* 무시 */ }
      setVerified(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (verified) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-[420px]">
        {/* 아이콘 */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8481A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <h2 className="mb-1.5 text-center text-[22px] font-black tracking-tight text-ink">
          본인 확인
        </h2>
        <p className="mb-8 text-center text-[14px] leading-relaxed text-ink-sub">
          주문 정보를 확인하려면<br />
          주문 시 입력한 이름과 전화번호를 입력해주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">
              이름 <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="주문자 이름 입력"
              required
              autoFocus
              className="w-full rounded border border-line px-4 py-3 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">
              전화번호 <span className="text-brand">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
              className="w-full rounded border border-line px-4 py-3 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[13px] font-medium text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !phone.trim()}
            className="w-full rounded bg-brand py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                </svg>
                확인 중…
              </span>
            ) : "확인"}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-ink-del">
          주문번호 <span className="font-bold text-ink-sub">{serial}</span>
        </p>
      </div>
    </div>
  );
}
