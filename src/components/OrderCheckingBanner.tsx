"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  serial: string;
}

// 결제 팝업이 닫혔지만 아직 webhook이 미도착한 경우 표시
// 5초마다 주문 상태를 서버에 확인하고, PAID가 되면 자동으로 결제완료 화면으로 전환
export function OrderCheckingBanner({ serial }: Props) {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);
  const MAX = 24; // 5s × 24 = 2분

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      countRef.current += 1;
      try {
        const res = await fetch(`/api/orders/${serial}/status`, {
          credentials: "include",
        });
        if (res.ok) {
          const { status } = (await res.json()) as { status: string };
          const paid =
            status === "PAID" ||
            status === "IN_PRODUCTION" ||
            status === "SHIPPING" ||
            status === "DELIVERED";
          if (paid) {
            clearInterval(pollRef.current!);
            router.replace(`/orders/${serial}?paid=1`);
            return;
          }
        }
      } catch {
        /* 네트워크 오류 무시 */
      }

      if (countRef.current >= MAX) {
        clearInterval(pollRef.current!);
        // 더 이상 폴링하지 않음 — 배너는 그대로 남아 있음
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [serial, router]);

  return (
    <div className="mb-6 rounded border border-yellow-400 bg-yellow-50 p-5">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 shrink-0 text-yellow-500"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <h2 className="text-[15px] font-bold text-yellow-700">결제 확인 중입니다…</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-yellow-700">
            결제가 완료되면 이 페이지가 자동으로 업데이트됩니다.
            <br />
            잠시 기다려 주세요. (5초마다 확인)
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-3 rounded-sm border border-yellow-400 bg-white px-4 py-1.5 text-[13px] font-medium text-yellow-700 hover:bg-yellow-50"
          >
            지금 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
