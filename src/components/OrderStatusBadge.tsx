"use client";

import { useState, useTransition } from "react";

/* 4단계 순환 */
const CYCLE = [
  { value: "PENDING",       label: "결제대기", color: "bg-[#f59e0b]" },
  { value: "PAID",          label: "결제완료", color: "bg-[#22c55e]" },
  { value: "IN_PRODUCTION", label: "제작중",   color: "bg-[#E8481A]" },
  { value: "DELIVERED",     label: "발송완료", color: "bg-[#10b981]" },
] as const;

/* 사이클 밖 상태 (표시 전용 — 클릭하면 PENDING 으로) */
const EXTRA: Record<string, { label: string; color: string }> = {
  SHIPPING:  { label: "배송중", color: "bg-[#3b82f6]" },
  CANCELLED: { label: "취소",   color: "bg-[#6b7280]" },
};

export function OrderStatusBadge({
  serial,
  initialStatus,
}: {
  serial: string;
  initialStatus: string;
}) {
  const [status, setStatus]   = useState(initialStatus);
  const [pending, start]      = useTransition();
  const [errMsg, setErrMsg]   = useState<string | null>(null);

  /* 현재 사이클 내 인덱스 */
  const idx     = CYCLE.findIndex((s) => s.value === status);
  const inCycle = idx !== -1;

  /* 현재 배지 정보 */
  const current = inCycle
    ? CYCLE[idx]
    : (EXTRA[status] ?? { label: status, color: "bg-[#6b7280]" });

  /* 다음 상태 */
  const nextStatus = inCycle
    ? CYCLE[(idx + 1) % CYCLE.length].value   // 순환
    : CYCLE[0].value;                          // 사이클 밖 → PENDING

  const nextLabel = CYCLE.find((s) => s.value === nextStatus)?.label ?? nextStatus;

  function handleClick() {
    if (pending) return;
    setErrMsg(null);
    start(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${serial}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) { setErrMsg("저장 실패"); return; }
        setStatus(nextStatus);
      } catch {
        setErrMsg("네트워크 오류");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={`클릭 → '${nextLabel}'로 변경`}
        className={`
          inline-flex items-center gap-1.5 rounded-sm px-3 py-1
          text-[13px] font-bold text-white whitespace-nowrap
          select-none transition-all
          ${current.color}
          ${pending ? "cursor-wait opacity-50" : "cursor-pointer hover:opacity-80 active:scale-95"}
        `}
      >
        {/* 회전 로딩 아이콘 */}
        {pending ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
          </svg>
        ) : (
          /* 클릭 힌트 화살표 */
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        )}
        {current.label}
      </button>

      {errMsg && (
        <span className="text-[11px] font-medium text-red-400">{errMsg}</span>
      )}
    </div>
  );
}
