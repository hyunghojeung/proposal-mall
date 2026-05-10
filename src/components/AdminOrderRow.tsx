"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminOrderPrintModal } from "@/components/AdminOrderPrintModal";
import { CancelOrderModal } from "@/components/CancelOrderModal";
import { DELIVERY_LABELS } from "@/lib/pricing";

/* ─── 상태 배지 정의 ─── */
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

export interface AdminOrderRowData {
  serial:          string;
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string;
  company:         string | null;
  deliveryMethod:  string;
  shippingAddress: string | null;
  memo:            string | null;
  totalAmount:     number;
  status:          string;
  paymentTid:      string | null;
  createdAt:       string;   // ISO string (Date → string 변환 후 전달)
  productSummary:  string;
}

export function AdminOrderRow({ order }: { order: AdminOrderRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus]         = useState(order.status);
  const [showPrint, setShowPrint]   = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [badgeErr, setBadgeErr]     = useState<string | null>(null);

  const isCancelled = status === "CANCELLED";
  const isPickup    = order.deliveryMethod === "PICKUP";
  const deliveryLabel = DELIVERY_LABELS[order.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? order.deliveryMethod;

  /* 상태 배지 순환 */
  const idx     = CYCLE.findIndex((s) => s.value === status);
  const inCycle = idx !== -1;
  const current = inCycle ? CYCLE[idx] : (EXTRA[status] ?? { label: status, color: "bg-[#6b7280]" });
  const nextSt  = inCycle ? CYCLE[(idx + 1) % CYCLE.length].value : CYCLE[0].value;
  const nextLbl = CYCLE.find((s) => s.value === nextSt)?.label ?? nextSt;

  function handleBadgeClick() {
    if (pending || isCancelled) return;
    setBadgeErr(null);
    start(async () => {
      const res = await fetch(`/api/admin/orders/${order.serial}`, {
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
      const res = await fetch(`/api/admin/orders/${order.serial}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) { alert("취소 처리 실패"); return; }
      setStatus("CANCELLED");   // 즉시 UI 반영
    });
    void reason; // reason은 메모용 (현재 API에 저장 안 함)
  }

  function handleDelete() {
    if (!confirm(`주문 [${order.serial}]을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    start(async () => {
      const res = await fetch(`/api/admin/orders/${order.serial}`, { method: "DELETE" });
      if (!res.ok) { alert("삭제 실패"); return; }
      router.refresh();
    });
  }

  const dateStr = new Date(order.createdAt).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      {/* ── 메인 행 ── */}
      <tr className="border-t border-[#262a3d] align-middle transition-colors hover:bg-[#252840]">

        {/* 번호 */}
        <td className="whitespace-nowrap px-5 py-3.5">
          <Link href={`/admin/orders/${order.serial}`} className="text-[#60a5fa] hover:underline">
            {order.serial}
          </Link>
        </td>

        {/* 고객정보 */}
        <td className="px-5 py-3.5">
          <p className="text-white">{order.customerName}</p>
          {order.company && <p className="text-[13px] text-[#b8c0e0]">{order.company}</p>}
          <p className="text-[13px] text-[#b8c0e0]">{order.customerEmail}</p>
          <p className="text-[13px] text-[#b8c0e0]">{order.customerPhone}</p>
        </td>

        {/* 상품 */}
        <td className="px-5 py-3.5">
          <p className="max-w-[220px] truncate text-[13px] text-[#d8ddf0]">{order.productSummary}</p>
          <p className="mt-0.5 text-[13px] text-[#8890b8]">{deliveryLabel}</p>
        </td>

        {/* 결제수단 */}
        <td className="whitespace-nowrap px-5 py-3.5">
          {order.paymentTid ? (
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[#4ade80] text-[13px]">✓</span>
                <span className="text-white text-[13px]">카드결제</span>
              </div>
              <p className="mt-0.5 text-[13px] text-[#b8c0e0]">{order.paymentTid}</p>
            </div>
          ) : (
            <span className="text-[13px] text-[#d8ddf0]">무통장입금</span>
          )}
        </td>

        {/* 주문상태 배지 — 클릭으로 순환 */}
        <td className="whitespace-nowrap px-5 py-3.5">
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={handleBadgeClick}
              disabled={pending || isCancelled}
              title={isCancelled ? "취소된 주문" : `클릭 → '${nextLbl}'로 변경`}
              className={[
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1",
                "text-[13px] text-white whitespace-nowrap select-none transition-all",
                current.color,
                pending         ? "cursor-wait opacity-50"
                  : isCancelled ? "cursor-default opacity-90"
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
            {badgeErr && <span className="text-[13px] text-red-400">{badgeErr}</span>}
          </div>
        </td>

        {/* 결제금액 */}
        <td className="whitespace-nowrap px-5 py-3.5 text-right">
          <span className="text-white">₩{order.totalAmount.toLocaleString()}</span>
        </td>

        {/* 주문일 */}
        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#b8c0e0]">{dateStr}</td>

        {/* 관리 버튼 */}
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
              <span className="rounded bg-[#262a3d] px-3 py-1.5 text-[13px] text-[#6b7280]">취소됨</span>
            ) : (
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                disabled={pending}
                className="rounded bg-[#6b7280] px-3 py-1.5 text-[13px] text-white hover:bg-red-500 disabled:opacity-40"
              >
                취소
              </button>
            )}

            {/* 주문서 */}
            <button
              type="button"
              onClick={() => setShowPrint(true)}
              className="rounded bg-[#374151] px-3 py-1.5 text-[13px] text-white hover:bg-[#4b5563]"
            >
              주문서
            </button>
          </div>
        </td>
      </tr>

      {/* ── 배송지 서브 행 ── */}
      <tr className="border-t border-[#1c2030] bg-[#0f1220]">
        <td />
        <td colSpan={7} className="px-5 py-3 text-[13px]">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <span className="text-[#f5c842]">수령인:</span>{" "}
              <span className="text-[#d8ddf0]">
                {order.company ? `${order.company} (${order.customerName})` : order.customerName}
              </span>
            </span>
            <span>
              <span className="text-[#f5c842]">주소:</span>{" "}
              <span className="text-[#d8ddf0]">
                {isPickup ? "직접 방문 수령" : (order.shippingAddress ?? "-")}
              </span>
            </span>
            {order.memo && (
              <span>
                <span className="text-[#f5c842]">배송메모:</span>{" "}
                <span className="text-[#d8ddf0]">{order.memo}</span>
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* 취소 확인 모달 */}
      {showCancel && (
        <CancelOrderModal
          serial={order.serial}
          customerName={order.customerName}
          totalAmount={order.totalAmount}
          onConfirm={handleCancelConfirm}
          onClose={() => setShowCancel(false)}
        />
      )}

      {/* 주문서 모달 */}
      {showPrint && (
        <AdminOrderPrintModal serial={order.serial} onClose={() => setShowPrint(false)} />
      )}
    </>
  );
}
