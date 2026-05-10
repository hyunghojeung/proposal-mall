"use client";

import { useState } from "react";

const CANCEL_REASONS = [
  "고객 요청",
  "결제 미완료 (기한 초과)",
  "재고 부족",
  "배송 불가 지역",
  "중복 주문",
  "기타",
];

interface Props {
  serial: string;
  customerName: string;
  totalAmount: number;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function CancelOrderModal({ serial, customerName, totalAmount, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[420px] rounded-xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 rounded-t-xl bg-red-50 px-6 py-5 border-b border-red-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-black text-red-700">주문 취소 확인</h2>
            <p className="text-[13px] text-red-500">이 작업은 취소 후 되돌리기 어렵습니다</p>
          </div>
        </div>

        {/* 주문 정보 */}
        <div className="mx-6 mt-5 rounded-lg border border-line bg-bg p-4 text-[14px]">
          <div className="flex justify-between py-1.5">
            <span className="text-ink-sub">주문번호</span>
            <span className="font-black text-ink">{serial}</span>
          </div>
          <div className="flex justify-between border-t border-line py-1.5">
            <span className="text-ink-sub">주문자</span>
            <span className="font-medium text-ink">{customerName}</span>
          </div>
          <div className="flex justify-between border-t border-line py-1.5">
            <span className="text-ink-sub">결제금액</span>
            <span className="font-bold text-brand">{totalAmount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 취소 사유 */}
        <div className="mx-6 mt-5">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">
            취소 사유 <span className="text-brand">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-line bg-white px-4 py-2.5 text-[14px] text-ink outline-none focus:border-brand"
          >
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 px-6 py-5 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded border border-line bg-white py-3 text-[15px] font-bold text-ink hover:bg-bg"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="flex-1 rounded bg-red-500 py-3 text-[15px] font-bold text-white hover:bg-red-600"
          >
            취소 처리
          </button>
        </div>
      </div>
    </div>
  );
}
