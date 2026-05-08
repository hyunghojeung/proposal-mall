"use client";

import { useEffect, useState } from "react";
import { DELIVERY_LABELS } from "@/lib/pricing";

/* ────────────────────────────────── 타입 */
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

const STATUS_CLS: Record<string, string> = {
  PENDING:       "bg-amber-100 text-amber-700",
  PAID:          "bg-blue-100  text-blue-700",
  IN_PRODUCTION: "bg-orange-100 text-orange-700",
  SHIPPING:      "bg-purple-100 text-purple-700",
  DELIVERED:     "bg-green-100 text-green-700",
  CANCELLED:     "bg-gray-100  text-gray-500",
};

/* ────────────────────────────────── 공통 셀 */
function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-[#d1d5db] bg-[#f8fafc] px-4 py-2.5 text-left text-[13px] font-semibold text-[#374151] whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}
function TD({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border border-[#d1d5db] px-4 py-2.5 text-[13px] text-[#1f2937] ${className}`}>
      {children}
    </td>
  );
}

/* ────────────────────────────────── 섹션 헤더 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 mt-7 border-b-2 border-[#1d4ed8] pb-1.5">
      <h2 className="text-[15px] font-bold text-[#1e3a5f]">{title}</h2>
    </div>
  );
}

/* ────────────────────────────────── 모달 본체 */
export function AdminOrderPrintModal({
  serial,
  onClose,
}: {
  serial: string;
  onClose: () => void;
}) {
  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* 데이터 fetch */
  useEffect(() => {
    fetch(`/api/admin/orders/${serial}`)
      .then((r) => r.json())
      .then((d) => { if (d.order) setOrder(d.order); else setError("주문 없음"); })
      .catch(() => setError("불러오기 실패"))
      .finally(() => setLoading(false));
  }, [serial]);

  /* ESC 닫기 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* 스크롤 잠금 */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* 인쇄 */
  const handlePrint = () => window.print();

  /* ── 공통 렌더 래퍼 ── */
  return (
    <>
      {/* 인쇄용 CSS */}
      <style>{`
        @media print {
          body > *:not(#order-print-root) { display: none !important; }
          #order-print-root { position: static !important; overflow: visible !important; display: block !important; }
          #order-print-root .no-print    { display: none !important; }
          #order-print-root .print-paper {
            box-shadow: none !important; border-radius: 0 !important;
            max-height: none !important; overflow: visible !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; padding: 15mm !important;
          }
        }
      `}</style>

      {/* 오버레이 */}
      <div
        id="order-print-root"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="print-paper relative mx-4 w-full max-w-[860px] rounded-xl bg-white shadow-2xl">

          {/* ── 상단 헤더 ── */}
          <div className="border-b border-[#e5e7eb] bg-[#f0f6ff] px-8 py-6 text-center">
            <h1 className="text-[26px] font-black tracking-tight text-[#1e3a5f]">주 문 서</h1>
            {order && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[13px] text-gray-500">
                <span>주문번호: <b className="text-[#1d4ed8]">{order.serial}</b></span>
                <span>·</span>
                <span>발행일: {new Date(order.createdAt).toLocaleDateString("ko-KR")}</span>
                <span
                  className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${STATUS_CLS[order.status] ?? "bg-gray-100 text-gray-500"}`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            )}
          </div>

          {/* ── 컨텐츠 ── */}
          <div className="px-8 pb-8">
            {loading && (
              <p className="py-16 text-center text-[15px] text-gray-400">불러오는 중…</p>
            )}
            {error && (
              <p className="py-16 text-center text-[15px] text-red-500">{error}</p>
            )}

            {order && (
              <>
                {/* ── 주문 정보 ── */}
                <SectionHeader title="주문 정보" />
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <TH>고객명</TH>
                      <TD>{order.customerName}</TD>
                      <TH>회사명</TH>
                      <TD>{order.company ?? "-"}</TD>
                    </tr>
                    <tr>
                      <TH>연락처</TH>
                      <TD>{order.customerPhone}</TD>
                      <TH>이메일</TH>
                      <TD>{order.customerEmail}</TD>
                    </tr>
                    <tr>
                      <TH>주문일</TH>
                      <TD>{new Date(order.createdAt).toLocaleDateString("ko-KR")}</TD>
                      <TH>결제방법</TH>
                      <TD>{order.paymentTid ? `카드결제 (${order.paymentTid})` : "계좌이체"}</TD>
                    </tr>
                  </tbody>
                </table>

                {/* ── 주문 상품 목록 ── */}
                <SectionHeader title={`주문 상품 목록 (총 ${order.items.length}개)`} />
                <div className="space-y-4">
                  {order.items.map((it, idx) => {
                    const options = it.optionsJson && typeof it.optionsJson === "object"
                      ? Object.entries(it.optionsJson as Record<string, string>)
                      : [];

                    return (
                      <div key={it.id} className="rounded-lg border border-[#d1d5db] overflow-hidden">
                        {/* 상품 번호 헤더 */}
                        <div className="bg-[#f0f6ff] px-4 py-2.5 text-[14px] font-bold text-[#1e3a5f] border-b border-[#d1d5db]">
                          {idx + 1}. {it.productName}
                        </div>
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <TH>상품명</TH>
                              <TD colSpan={3}>{it.productName}</TD>
                            </tr>
                            <tr>
                              <TH>수량</TH>
                              <TD>{it.quantity}개</TD>
                              <TH>금액</TH>
                              <TD className="font-bold text-[#1d4ed8]">
                                ₩{it.subtotal.toLocaleString()}
                              </TD>
                            </tr>
                            {(options.length > 0 || it.pageCount) && (
                              <tr>
                                <TH>상세 정보</TH>
                                <TD colSpan={3}>
                                  <ul className="space-y-1">
                                    {options.map(([k, v]) => (
                                      <li key={k} className="flex gap-2">
                                        <span className="font-semibold text-[#374151]">{k}:</span>
                                        <span className="text-[#1f2937]">{v}</span>
                                      </li>
                                    ))}
                                    {it.pageCount && (
                                      <li className="flex gap-2">
                                        <span className="font-semibold text-[#374151]">페이지 수:</span>
                                        <span className="text-[#1f2937]">{it.pageCount}쪽</span>
                                      </li>
                                    )}
                                  </ul>
                                </TD>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                {/* ── 결제 내역 ── */}
                <SectionHeader title="결제 내역" />
                <table className="w-full border-collapse">
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={it.id}>
                        <TH className="w-[55%]">{idx + 1}. {it.productName}</TH>
                        <TD className="text-right font-medium">
                          ₩{it.subtotal.toLocaleString()}
                        </TD>
                      </tr>
                    ))}
                    <tr>
                      <TH>배송비</TH>
                      <TD className="text-right font-medium">
                        {DELIVERY_LABELS[order.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? order.deliveryMethod}
                        {" / "}
                        {order.shippingFee === 0 ? "무료" : `₩${order.shippingFee.toLocaleString()}`}
                      </TD>
                    </tr>
                    <tr className="bg-[#eff6ff]">
                      <td className="border border-[#d1d5db] px-4 py-3 text-[14px] font-black text-[#1e3a5f]">
                        최종금액
                      </td>
                      <td className="border border-[#d1d5db] px-4 py-3 text-right text-[20px] font-black text-[#1d4ed8]">
                        ₩{order.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ── 배송 정보 ── */}
                {order.deliveryMethod !== "PICKUP" && (
                  <>
                    <SectionHeader title="배송 정보" />
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <TH>수령인</TH>
                          <TD>{order.customerName}</TD>
                          <TH>연락처</TH>
                          <TD>{order.customerPhone}</TD>
                        </tr>
                        <tr>
                          <TH>주소</TH>
                          <TD colSpan={3}>{order.shippingAddress ?? "-"}</TD>
                        </tr>
                        <tr>
                          <TH>배송메모</TH>
                          <TD colSpan={3}>{order.memo ?? ""}</TD>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                {/* 직접방문 메모 */}
                {order.deliveryMethod === "PICKUP" && order.memo && (
                  <>
                    <SectionHeader title="요청사항" />
                    <div className="rounded border border-[#d1d5db] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#374151]">
                      {order.memo}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── 버튼 ── */}
          <div className="no-print flex justify-center gap-4 border-t border-[#e5e7eb] px-8 py-5">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!order}
              className="flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-8 py-3 text-[15px] font-bold text-white hover:bg-[#1e40af] disabled:opacity-40"
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
              className="flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-8 py-3 text-[15px] font-medium text-[#374151] hover:bg-[#f9fafb]"
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
