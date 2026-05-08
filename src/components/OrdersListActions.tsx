"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminOrderPrintModal } from "@/components/AdminOrderPrintModal";

export function OrdersListActions({
  serial,
  status,
}: {
  serial: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showPrint, setShowPrint] = useState(false);

  function handleDelete() {
    if (!confirm(`주문 [${serial}]을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/orders/${serial}`, { method: "DELETE" });
      if (!res.ok) { alert("삭제 실패. 다시 시도해 주세요."); return; }
      router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm(`주문 [${serial}]을 취소 처리하시겠습니까?`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/orders/${serial}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) { alert("취소 처리 실패. 다시 시도해 주세요."); return; }
      router.refresh();
    });
  }

  const isCancelled = status === "CANCELLED";

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* 삭제 */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          title="주문 삭제"
          className="flex h-8 w-8 items-center justify-center rounded bg-[#ef4444] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>

        {/* 취소 */}
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending || isCancelled}
          className="rounded bg-[#6b7280] px-3 py-1.5 text-[13px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          취소
        </button>

        {/* 주문서 → 팝업 */}
        <button
          type="button"
          onClick={() => setShowPrint(true)}
          className="rounded bg-[#374151] px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-[#4b5563]"
        >
          주문서
        </button>
      </div>

      {/* 주문서 팝업 모달 */}
      {showPrint && (
        <AdminOrderPrintModal
          serial={serial}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
}
