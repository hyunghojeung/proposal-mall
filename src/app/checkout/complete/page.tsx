"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CompleteContent() {
  const router = useRouter();
  const params = useSearchParams();

  const total       = Number(params.get("total") ?? 0);
  const products    = params.get("products") ?? "";
  const createdAt   = params.get("createdAt") ?? new Date().toISOString();
  const dateStr     = new Date(createdAt).toLocaleString("ko-KR");

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-lg text-center">
        {/* 체크 아이콘 */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-[22px] font-black text-green-600">주문이 완료되었습니다!</h1>

        {/* 주문 정보 */}
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white text-left">
          <div className="bg-bg px-5 py-3 text-center text-[13px] font-bold text-ink">주문 정보</div>
          <div className="divide-y divide-line text-[14px]">
            {[
              { label: "상품",     value: products },
              { label: "결제 금액", value: `${total.toLocaleString()}원` },
              { label: "결제 방법", value: "무통장 입금" },
              { label: "주문 일시", value: dateStr },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-ink-sub">{label}</span>
                <span className="font-medium text-ink">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 입금 안내 */}
        <div className="mt-4 overflow-hidden rounded-lg border border-blue-200 bg-blue-50 text-center">
          <div className="border-b border-blue-200 px-5 py-3 text-[13px] font-bold text-blue-700">입금 안내</div>
          <div className="px-5 py-5">
            <p className="text-[13px] text-blue-600">입금할 금액</p>
            <p className="mt-1 text-[28px] font-black text-blue-700">{total.toLocaleString()}원</p>
            <div className="mt-4 space-y-1">
              <p className="text-[26px] font-black tracking-tight text-blue-700">우리은행 208-08-426260</p>
              <p className="text-[16px] font-bold text-blue-600">예금주: 정형호</p>
              <p className="mt-3 text-[13px] text-blue-500">입금 확인 후 제작을 시작합니다.</p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-sm border border-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink hover:border-brand hover:text-brand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            홈으로
          </button>
          <button
            type="button"
            onClick={() => router.push("/contact")}
            className="flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            문의하기
          </button>
        </div>
        <p className="mt-4 text-[12px] text-ink-sub">주문 관련 문의사항이 있으시면 언제든 연락해주세요.</p>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-ink-sub">불러오는 중…</p></div>}>
      <CompleteContent />
    </Suspense>
  );
}
