"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCompleteContent() {
  const params = useSearchParams();
  const serial = params.get("serial") ?? "";
  const amount = params.get("amount") ?? "0";
  const status = params.get("status") ?? "success";
  const msg    = params.get("msg") ?? "";
  const [countdown, setCountdown] = useState(4);

  const isSuccess  = status === "success";
  const isCancelled = status === "cancelled";
  const isFailed   = status === "failed";

  // 성공 시: 부모 창 이동 + 카운트다운 후 닫기
  // 실패/취소 시: 자동 닫힘 없음 (사용자가 직접 닫기 버튼 클릭)
  useEffect(() => {
    if (!isSuccess) return;

    // 부모 창에 주문 완료 페이지 로드
    if (typeof window !== "undefined" && window.opener) {
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
  }, [serial, isSuccess]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-sm p-8 text-center">

        {/* ── 성공 ── */}
        {isSuccess && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A] mb-2">결제가 완료되었습니다!</h1>
            {serial && (
              <p className="text-[14px] text-[#888] mb-2">
                주문번호: <span className="font-bold text-[#1A1A1A]">{serial}</span>
              </p>
            )}
            {Number(amount) > 0 && (
              <p className="text-[22px] font-bold text-[#E8481A] mb-4">
                {Number(amount).toLocaleString()}원
              </p>
            )}
            <p className="text-[13px] text-[#888] mb-6">
              {countdown}초 후 자동으로 창이 닫힙니다.
            </p>
            <button onClick={() => window.close()}
              className="w-full py-3 rounded bg-[#E8481A] text-white text-[15px] font-bold hover:bg-[#c93d14] transition-colors">
              창 닫기
            </button>
            <p className="mt-3 text-[12px] text-[#888]">창이 닫히면 주문 상세 페이지로 이동됩니다.</p>
          </>
        )}

        {/* ── 취소 ── */}
        {isCancelled && (
          <>
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-yellow-600 mb-2">결제가 취소되었습니다</h1>
            <p className="text-[14px] text-[#888] mb-6">
              결제를 취소하셨습니다.<br/>다시 시도하려면 창을 닫고 결제하기를 눌러주세요.
            </p>
            {msg && <p className="text-[12px] text-red-500 mb-4">{msg}</p>}
            <button onClick={() => window.close()}
              className="w-full py-3 rounded bg-[#888] text-white text-[15px] font-bold hover:bg-[#666] transition-colors">
              창 닫기
            </button>
          </>
        )}

        {/* ── 실패 ── */}
        {isFailed && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="text-[18px] font-bold text-red-600 mb-2">결제에 실패했습니다</h1>
            <p className="text-[14px] text-[#888] mb-6">
              결제 처리 중 오류가 발생했습니다.<br/>다시 시도해 주세요.
            </p>
            {msg && <p className="text-[12px] text-red-500 mb-4">{msg}</p>}
            <button onClick={() => window.close()}
              className="w-full py-3 rounded bg-[#888] text-white text-[15px] font-bold hover:bg-[#666] transition-colors">
              창 닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#888]">처리 중...</p>
      </div>
    }>
      <PaymentCompleteContent />
    </Suspense>
  );
}
