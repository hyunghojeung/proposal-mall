"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminOrderPrintModal } from "@/components/AdminOrderPrintModal";
import { CancelOrderModal } from "@/components/CancelOrderModal";

/* ─── 상태 정의 ─── */
const CYCLE = [
  { value: "PENDING",       label: "결제대기", color: "bg-[#f59e0b]" },
  { value: "PAID",          label: "결제완료", color: "bg-[#22c55e]" },
  { value: "IN_PRODUCTION", label: "제작중",   color: "bg-[#E8481A]" },
  { value: "DELIVERED",     label: "발송완료", color: "bg-[#10b981]" },
] as const;

const EXTRA: Record<string, { label: string; color: string }> = {
  SHIPPING:  { label: "배송중", color: "bg-[#3b82f6]" },
  CANCELLED: { label: "취소",   color: "bg-[#6b7280]" },
};

interface Props {
  serial: string;
  initialStatus: string;
  customerName: string;
  totalAmount: number;
}

/**
 * 주문상태 배지 + 관리 버튼을 하나의 컴포넌트로 묶어 상태를 공유합니다.
 * tr 안에서 <td> 두 개를 Fragment로 반환합니다.
 */
export function AdminOrderRowActions({ serial, initialStatus, customerName, totalAmount }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus]           = useState(initialStatus);
  const [showPrint, setShowPrint]     = useState(false);
  const [showCancel, setShowCancel]   = useState(false);
  const [badgeErr, setBadgeErr]       = useState<string | null>(null);

  /* 상태 배지 순환 */
  const idx      = CYCLE.findIndex((s) => s.value === status);
  const inCycle  = idx !== -1;
  const current  = inCycle ? CYCLE[idx] : (EXTRA[status] ?? { label: status, color: "bg-[#6b7280]" });
  const nextSt   = inCycle ? CYCLE[(idx + 1) % CYCLE.length].value : CYCLE[0].value;
  const nextLbl  = CYCLE.find((s) => s.value === nextSt)?.label ?? nextSt;
  const isCancelled = status === "CANCELLED";

  function handleBadgeClick() {
    if (pending || isCancelled) return;
    setBadgeErr(null);
    start(async () => {
      const res = await fetch(`/api/admin/orders/${serial}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextSt }),
      });
      if (!res.ok) { setBadgeErr("저장 실패"); return; }
      setStatus(nextSt);
    });
  }

  function handleCancelConfirm(reason: string) {
    setShowCancel(false);
    start(async () => {
      const res = await fetch(`/api/admin/orders/${serial}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", cancelReason: reason }),
      });
      if (!res.ok) { alert("취소 처리 실패"); return; }
      setStatus("CANCELLED"); // 배지 + 버튼 동시 즉시 반영
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`주문 [${serial}]을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/orders/${serial}`, { method: "DELETE" });
      if (!res.ok) { alert("삭제 실패"); return; }
      router.refresh();
    });
  }

  return (
    <>
      {/* ── td 1: 주문상태 배지 ── */}
      <td className="whitespace-nowrap px-5 py-3.5">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={handleBadgeClick}
            disabled={pending || isCancelled}
            title={isCancelled ? "취소된 주문" : `클릭 → '${nextLbl}'로 변경`}
            className={[
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1",
              "text-[13px] font-bold text-white whitespace-nowrap select-none transition-all",
              current.color,
              pending        ? "cursor-wait opacity-50"
                : isCancelled ? "cursor-default opacity-80"
                : "cursor-pointer hover:opacity-80 active:scale-95",
            ].join(" ")}
          >
            {pending ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
              </svg>
            ) : isCancelled ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
            {current.label}
          </button>
          {badgeErr && <span className="text-[11px] font-medium text-red-400">{badgeErr}</span>}
        </div>
      </td>

      {/* ── td 2: 관리 버튼 ── */}
      <td className="whitespace-nowrap px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          {/* 삭제 */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            title="주문 삭제"
            className="flex h-8 w-8 items-center justify-center rounded bg-[#ef4444] text-white hover:opacity-80 disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>

          {/* 취소 / 취소됨 */}
          {isCancelled ? (
            <span className="rounded bg-[#2e2e33] px-3 py-1.5 text-[13px] font-bold text-[#6b7280]">
              취소됨
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              disabled={pending}
              className="rounded bg-[#6b7280] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-red-500 disabled:opacity-40"
            >
              취소
            </button>
          )}

          {/* 주문서 */}
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            className="rounded bg-[#374151] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-[#4b5563]"
          >
            주문서
          </button>
        </div>

        {/* 취소 확인 모달 */}
        {showCancel && (
          <CancelOrderModal
            serial={serial}
            customerName={customerName}
            totalAmount={totalAmount}
            onConfirm={handleCancelConfirm}
            onClose={() => setShowCancel(false)}
          />
        )}

        {/* 주문서 모달 */}
        {showPrint && (
          <AdminOrderPrintModal serial={serial} onClose={() => setShowPrint(false)} />
        )}
      </td>
    </>
  );
}
