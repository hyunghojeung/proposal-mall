"use client";

import { useEffect, useRef } from "react";
import { type CartItem, cartSubtotal } from "@/lib/cart";
import { shippingFee, type DeliveryMethod, DELIVERY_LABELS } from "@/lib/pricing";

interface QuoteModalProps {
  items: CartItem[];
  delivery: DeliveryMethod;
  onClose: () => void;
}

function generateQuoteNo(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randPart = Math.random().toString(36).toUpperCase().slice(2, 10);
  return `CART-${datePart}-${randPart}`;
}

const QUOTE_NO = typeof window !== "undefined" ? generateQuoteNo() : "CART-00000000-XXXXXXXX";

export function QuoteModal({ items, delivery, onClose }: QuoteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const subtotal = cartSubtotal(items);
  const fee = shippingFee(subtotal, delivery);
  const baseAmount = subtotal + fee;          // VAT 별도 소계
  const vatAmount = Math.round(baseAmount * 0.1);
  const totalAmount = baseAmount + vatAmount;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          body > *:not(#quote-print-root) { display: none !important; }
          #quote-print-root { display: block !important; position: static !important; overflow: visible !important; }
          #quote-print-root .no-print { display: none !important; }
          #quote-print-root .quote-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
          }
        }
      `}</style>

      {/* 오버레이 */}
      <div
        id="quote-print-root"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          ref={modalRef}
          className="quote-paper relative mx-4 w-full max-w-[780px] rounded-lg bg-white px-12 py-10 shadow-2xl"
        >
          {/* ── 헤더 ── */}
          <div className="mb-6 text-center">
            <h1 className="text-[32px] font-black tracking-widest text-ink">견 적 서</h1>
            <p className="mt-2 text-[14px] text-ink-sub">견적일: {today}</p>
            <p className="text-[13px] text-ink-sub">주문번호: {QUOTE_NO}</p>
          </div>

          {/* ── 발행업체 정보 ── */}
          <div className="mb-6 rounded border border-[#c5d8e8] bg-[#f0f6fb] p-5">
            <h2 className="mb-3 text-[15px] font-bold text-[#1a3a5c]">발행업체 정보</h2>
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[14px] text-ink">
                <div><span className="text-ink-sub">상호:</span> 인쇄의 창</div>
                <div><span className="text-ink-sub">대표:</span> 정형호</div>
                <div><span className="text-ink-sub">종목:</span> 인쇄, 출판업</div>
                <div><span className="text-ink-sub">E-mail:</span> <span className="text-brand">blackcopy2@naver.com</span></div>
                <div><span className="text-ink-sub">업태:</span> 제조서비스</div>
                <div><span className="text-ink-sub">home:</span> <span className="text-brand">www.hardcover.co.kr</span></div>
                <div className="col-span-2"><span className="text-ink-sub">사업자번호:</span> 114-04-56136</div>
                <div className="col-span-2"><span className="text-ink-sub">주소:</span> 서울특별시 용산구 한강대로 40길 33 성산빌딩 2층 인쇄의창</div>
              </div>
              {/* 직인 이미지 */}
              <div className="ml-4 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/stamp.png"
                  alt="직인"
                  width={88}
                  height={88}
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
          </div>

          {/* ── 주문 상품 목록 ── */}
          <div className="mb-6">
            <h2 className="mb-4 border-b-2 border-ink pb-2 text-[16px] font-bold text-ink">주문 상품 목록</h2>
            <div className="space-y-5">
              {items.map((it) => (
                <div key={it.id} className="border-b border-line pb-5 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-bold text-ink">
                      상품명: {it.productName}
                      {it.quantity > 1 ? ` — ${it.productName} ${it.quantity}개` : ""}
                    </p>
                    <p className="shrink-0 text-[15px] font-bold text-ink">
                      {it.subtotal.toLocaleString()}원
                    </p>
                  </div>
                  {(Object.keys(it.options).length > 0 || it.pageCount) && (
                    <div className="mt-2 text-[14px] text-ink-sub">
                      <p className="mb-1 font-medium">옵션:</p>
                      <ul className="ml-2 space-y-0.5">
                        {Object.entries(it.options).map(([k, v]) => (
                          <li key={k}>• {k}: {v}</li>
                        ))}
                        {it.pageCount && <li>• 페이지 수: {it.pageCount}쪽</li>}
                        <li>• 수량: {it.quantity}개</li>
                        <li>• 배송: {DELIVERY_LABELS[delivery]}</li>
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── 가격 내역 ── */}
          <div className="mb-6">
            <h2 className="mb-3 border-b-2 border-ink pb-2 text-[16px] font-bold text-ink">가격 내역</h2>
            <table className="w-full text-[14px]">
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-2.5 text-ink-sub">상품 금액</td>
                  <td className="py-2.5 text-right font-medium text-ink">
                    {subtotal.toLocaleString()}원
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2.5 text-ink-sub">배송비</td>
                  <td className="py-2.5 text-right font-medium text-ink">
                    {fee === 0 ? "별도 (착불/방문)" : `${fee.toLocaleString()}원`}
                  </td>
                </tr>
                <tr className="border-b-2 border-ink bg-[#f5f7fa]">
                  <td className="py-3 font-bold text-[#1a3a5c]">소계 (VAT 별도)</td>
                  <td className="py-3 text-right font-bold text-[#1a3a5c]">
                    {baseAmount.toLocaleString()}원
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2.5 text-ink-sub">VAT (10%)</td>
                  <td className="py-2.5 text-right font-medium text-ink">
                    {vatAmount.toLocaleString()}원
                  </td>
                </tr>
                <tr className="bg-[#f0f6fb]">
                  <td className="py-3.5 text-[16px] font-black text-[#1a3a5c]">총 금액</td>
                  <td className="py-3.5 text-right text-[18px] font-black text-brand">
                    {totalAmount.toLocaleString()}원
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 견적 조건 ── */}
          <div className="rounded border border-line bg-bg p-4 text-[13px]">
            <p className="mb-1.5 font-bold text-ink">견적 조건</p>
            <ul className="space-y-1 text-ink-sub">
              <li>• 견적 유효기간: 7일 &nbsp;•&nbsp; 결제 조건: 선납 &nbsp;•&nbsp; 제작 기간: 2~3일 소요됩니다 &nbsp;•&nbsp; VAT 포함 금액입니다</li>
              <li>• 배송비는 선불로 선택한 항목에 한하여 한 번만 적용되었습니다</li>
            </ul>
          </div>

          {/* ── 버튼 ── */}
          <div className="no-print mt-8 flex justify-center gap-4">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded bg-brand px-8 py-3 text-[16px] font-bold text-white hover:bg-brand-dark"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              프린트
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded border border-line px-8 py-3 text-[16px] font-medium text-ink hover:border-ink hover:bg-bg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
