"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentCompleteContent() {
  const params = useSearchParams();
  const serial = params.get("serial") ?? "";
  const amount = params.get("amount") ?? "0";
  const status = params.get("status") ?? "success";
  const [countdown, setCountdown] = useState(3);

  const isFailed = status === "failed" || status === "cancelled";

  // 부모 창에 알리고 자동으로 닫기
  useEffect(() => {
    if (!isFailed && typeof window !== "undefined" && window.opener) {
      try {
        window.opener.location.href = `/orders/${serial}?paid=1`;
      } catch {
        // cross-origin 차단 무시
      }
    }

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          window.close();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [serial, isFailed]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-sm p-8 text-center">
        {isFailed ? (
          <>
            {/* 실패 아이콘 */}
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-red-600 mb-2">결제가 취소되었습니다</h1>
            <p className="text-[14px] text-[#888] mb-6">
              결제가 완료되지 않았습니다.<br />
              다시 시도해 주세요.
            </p>
          </>
        ) : (
          <>
            {/* 성공 아이콘 */}
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A] mb-2">결제가 완료되었습니다!</h1>
            <p className="text-[14px] text-[#888] mb-4">
              주문번호: <span className="font-bold text-[#1A1A1A]">{serial}</span>
            </p>
            <p className="text-[22px] font-bold text-[#E8481A] mb-6">
              {Number(amount).toLocaleString()}원
            </p>
            <p className="text-[13px] text-[#888] mb-6">
              {countdown}초 후 자동으로 창이 닫힙니다.
            </p>
          </>
        )}

        <button
          onClick={() => window.close()}
          className="w-full py-3 rounded bg-[#E8481A] text-white text-[15px] font-bold hover:bg-[#c93d14] transition-colors"
        >
          창 닫기
        </button>

        {!isFailed && (
          <p className="mt-3 text-[12px] text-[#888]">
            창이 닫히면 주문 상세 페이지로 이동됩니다.
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-[#888]">처리 중...</p>
    </div>}>
      <PaymentCompleteContent />
    </Suspense>
  );
}
