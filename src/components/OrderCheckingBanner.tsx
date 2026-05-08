"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  serial: string;
}

// 결제 팝업이 닫혔지만 아직 webhook이 미도착한 경우 표시
// 5초마다 주문 상태를 서버에 확인하고, PAID가 되면 자동으로 결제완료 화면으로 전환
export function OrderCheckingBanner({ serial }: Props) {
  const router = useRouter();
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);
  const MAX = 24; // 5s × 24 = 2분

  const [checking, setChecking] = useState(false); // 폴링 중 표시용

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      countRef.current += 1;
      setChecking(true);
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

      setChecking(false);

      if (countRef.current >= MAX) {
        clearInterval(pollRef.current!);
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [serial, router]);

  return (
    <div className="mb-6 rounded border border-red-300 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        {/* X 아이콘 */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <div className="flex-1">
          <h2 className="text-[15px] font-bold text-red-700">
            결제가 완료되지 않았습니다
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-red-600">
            결제창이 닫혔습니다. 결제를 취소하셨거나 창을 닫으신 경우입니다.
            <br />
            결제를 다시 진행하시려면 아래 버튼을 눌러 주세요.
          </p>

          {/* 폴링 안내 */}
          {checking && (
            <p className="mt-2 text-[12px] text-red-400">
              결제 완료 여부를 확인 중입니다…
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {/* 다시 결제하기 — 장바구니로 이동 */}
            <Link
              href="/checkout"
              className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              다시 결제하기
            </Link>

            {/* 수동 새로고침 */}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-red-300 bg-white px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              결제 상태 새로고침
            </button>
          </div>

          <p className="mt-3 text-[12px] text-red-400">
            결제를 완료하셨다면 잠시 후 자동으로 이 페이지가 업데이트됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
