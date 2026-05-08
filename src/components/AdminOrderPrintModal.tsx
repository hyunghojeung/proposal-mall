"use client";

import { useEffect, useState } from "react";
import { DELIVERY_LABELS } from "@/lib/pricing";

/* ── 타입 ── */
interface OrderItem {
  id: number;
  productName: string;
  optionsJson: Record<string, string> | null;
  pageCount:   number | null;
  quantity:    number;
  unitPrice:   number;
  subtotal:    number;
}
interface OrderDetail {
  serial:          string;
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string;
  company:         string | null;
  deliveryMethod:  string;
  shippingAddress: string | null;
  memo:            string | null;
  totalAmount:     number;
  shippingFee:     number;
  status:          string;
  paymentTid:      string | null;
  createdAt:       string;
  items:           OrderItem[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:       "결제대기",
  PAID:          "결제완료",
  IN_PRODUCTION: "제작중",
  SHIPPING:      "배송중",
  DELIVERED:     "발송완료",
  CANCELLED:     "취소",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING:       "bg-amber-100 text-amber-700 border border-amber-300",
  PAID:          "bg-green-100 text-green-700 border border-green-300",
  IN_PRODUCTION: "bg-orange-100 text-orange-700 border border-orange-300",
  SHIPPING:      "bg-blue-100 text-blue-700 border border-blue-300",
  DELIVERED:     "bg-emerald-100 text-emerald-700 border border-emerald-300",
  CANCELLED:     "bg-gray-100 text-gray-500 border border-gray-300",
};

/* ── 공통 테이블 셀 ── */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-[13px] font-semibold text-gray-600 whitespace-nowrap w-[120px]">
      {children}
    </th>
  );
}
function Td({ children, colSpan, className = "" }: { children: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td colSpan={colSpan} className={`border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-800 ${className}`}>
      {children}
    </td>
  );
}

/* ── 섹션 타이틀 ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 border-b-2 border-brand pb-1.5 first:mt-0">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
    </div>
  );
}

/* ── 모달 ── */
export function AdminOrderPrintModal({ serial, onClose }: { serial: string; onClose: () => void }) {
  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${serial}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order); else setError("주문 정보를 찾을 수 없습니다."); })
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [serial]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* 인쇄 CSS */}
      <style>{`
        @media print {
          body > *:not(#order-modal-root) { display: none !important; }
          #order-modal-root { position: static !important; overflow: visible !important; display: block !important; background: white !important; }
          #order-modal-root .no-print { display: none !important; }
          #order-modal-root .modal-paper {
            box-shadow: none !important; border-radius: 0 !important;
            max-height: none !important; overflow: visible !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; padding: 15mm !important;
          }
        }
      `}</style>

      {/* 오버레이 */}
      <div
        id="order-modal-root"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 py-8"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="modal-paper relative mx-4 w-full max-w-[800px] overflow-hidden rounded-xl bg-white shadow-2xl">

          {/* ── 헤더 ── */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-10 py-7 text-center">
            <h1 className="text-[28px] font-black tracking-widest text-ink">주 문 서</h1>
            {order && (
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-[13px] text-gray-500">
                <span>주문번호: <b className="text-brand">{order.serial}</b></span>
                <span className="text-gray-300">·</span>
                <span>발행일: {new Date(order.createdAt).toLocaleDateString("ko-KR")}</span>
                <span className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            )}
          </div>

          {/* ── 컨텐츠 ── */}
          <div className="bg-white px-10 pb-6 pt-2">

            {loading && (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <svg className="mr-2 animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/></svg>
                불러오는 중…
              </div>
            )}
            {error && (
              <p className="py-16 text-center text-[15px] text-red-500">{error}</p>
            )}

            {order && (
              <>
                {/* 주문 정보 */}
                <SectionTitle>주문 정보</SectionTitle>
                <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200">
                  <tbody>
                    <tr>
                      <Th>고객명</Th>
                      <Td>{order.customerName}</Td>
                      <Th>회사명</Th>
                      <Td>{order.company ?? "-"}</Td>
                    </tr>
                    <tr>
                      <Th>연락처</Th>
                      <Td>{order.customerPhone}</Td>
                      <Th>이메일</Th>
                      <Td>{order.customerEmail}</Td>
                    </tr>
                    <tr>
                      <Th>주문일</Th>
                      <Td>{new Date(order.createdAt).toLocaleDateString("ko-KR")}</Td>
                      <Th>결제방법</Th>
                      <Td>
                        {order.paymentTid
                          ? <span className="font-medium text-blue-600">카드결제 <span className="text-[12px] text-gray-400">({order.paymentTid})</span></span>
                          : <span className="font-medium text-amber-600">계좌이체</span>
                        }
                      </Td>
                    </tr>
                  </tbody>
                </table>

                {/* 주문 상품 목록 */}
                <SectionTitle>주문 상품 목록 (총 {order.items.length}개)</SectionTitle>
                <div className="space-y-3">
                  {order.items.map((it, idx) => {
                    const opts = it.optionsJson && typeof it.optionsJson === "object"
                      ? Object.entries(it.optionsJson as Record<string, string>)
                      : [];
                    return (
                      <div key={it.id} className="overflow-hidden rounded-lg border border-gray-200">
                        {/* 상품 번호 */}
                        <div className="border-b border-gray-200 bg-brand-light px-5 py-2.5">
                          <p className="text-[14px] font-bold text-brand">
                            {idx + 1}. {it.productName}
                          </p>
                        </div>
                        <table className="w-full border-collapse bg-white">
                          <tbody>
                            <tr>
                              <Th>상품명</Th>
                              <Td colSpan={3}>{it.productName}</Td>
                            </tr>
                            <tr>
                              <Th>수량</Th>
                              <Td>{it.quantity}개</Td>
                              <Th>금액</Th>
                              <Td className="font-bold text-brand">
                                ₩{it.subtotal.toLocaleString()}
                              </Td>
                            </tr>
                            {(opts.length > 0 || it.pageCount) && (
                              <tr>
                                <Th>상세 정보</Th>
                                <Td colSpan={3}>
                                  <ul className="space-y-1">
                                    {opts.map(([k, v]) => (
                                      <li key={k} className="flex gap-2 text-[13px]">
                                        <span className="font-semibold text-gray-500">{k}:</span>
                                        <span className="text-gray-800">{v}</span>
                                      </li>
                                    ))}
                                    {it.pageCount && (
                                      <li className="flex gap-2 text-[13px]">
                                        <span className="font-semibold text-gray-500">페이지 수:</span>
                                        <span className="text-gray-800">{it.pageCount}쪽</span>
                                      </li>
                                    )}
                                  </ul>
                                </Td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                {/* 결제 내역 */}
                <SectionTitle>결제 내역</SectionTitle>
                <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200">
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={it.id}>
                        <Th>{idx + 1}. {it.productName}</Th>
                        <Td className="text-right font-medium">
                          ₩{it.subtotal.toLocaleString()}
                        </Td>
                      </tr>
                    ))}
                    <tr>
                      <Th>배송비</Th>
                      <Td className="text-right font-medium">
                        {DELIVERY_LABELS[order.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? order.deliveryMethod}
                        {" / "}
                        {order.shippingFee === 0 ? "무료" : `₩${order.shippingFee.toLocaleString()}`}
                      </Td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-brand-light px-4 py-3.5 text-[14px] font-black text-brand">
                        최종금액
                      </td>
                      <td className="border border-gray-200 bg-brand-light px-4 py-3.5 text-right text-[20px] font-black text-brand">
                        ₩{order.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 배송 정보 (택배/퀵) */}
                {order.deliveryMethod !== "PICKUP" && (
                  <>
                    <SectionTitle>배송 정보</SectionTitle>
                    <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200">
                      <tbody>
                        <tr>
                          <Th>수령인</Th>
                          <Td>{order.customerName}</Td>
                          <Th>연락처</Th>
                          <Td>{order.customerPhone}</Td>
                        </tr>
                        <tr>
                          <Th>주소</Th>
                          <Td colSpan={3}>{order.shippingAddress ?? "-"}</Td>
                        </tr>
                        <tr>
                          <Th>배송메모</Th>
                          <Td colSpan={3} className="text-gray-500">{order.memo ?? "없음"}</Td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                {/* 직접방문 요청사항 */}
                {order.deliveryMethod === "PICKUP" && (
                  <>
                    <SectionTitle>요청사항</SectionTitle>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-[14px] text-gray-600">
                      {order.memo || "없음"}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── 버튼 ── */}
          <div className="no-print flex justify-center gap-3 border-t border-gray-200 bg-gray-50 px-10 py-5">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!order}
              className="flex items-center gap-2 rounded-lg bg-brand px-8 py-3 text-[15px] font-bold text-white hover:bg-brand-dark disabled:opacity-40"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              주문서 인쇄
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3 text-[15px] font-medium text-gray-600 hover:bg-gray-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              창 닫기
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
