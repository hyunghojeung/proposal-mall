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
const STATUS_COLOR: Record<string, React.CSSProperties> = {
  PENDING:       { backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" },
  PAID:          { backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
  IN_PRODUCTION: { backgroundColor: "#ffedd5", color: "#c2410c", border: "1px solid #fdba74" },
  SHIPPING:      { backgroundColor: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" },
  DELIVERED:     { backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" },
  CANCELLED:     { backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" },
};

/* ── 인라인 스타일 상수 (admin-dark CSS 덮어쓰기 방지) ── */
const S = {
  thCell: {
    backgroundColor: "#f9fafb",
    color: "#4b5563",
    border: "1px solid #e5e7eb",
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    width: 120,
    textAlign: "left" as const,
  },
  tdCell: {
    backgroundColor: "#ffffff",
    color: "#1f2937",
    border: "1px solid #e5e7eb",
    padding: "10px 16px",
    fontSize: 14,
  },
  tdCellRight: {
    backgroundColor: "#ffffff",
    color: "#1f2937",
    border: "1px solid #e5e7eb",
    padding: "10px 16px",
    fontSize: 14,
    textAlign: "right" as const,
    fontWeight: 500,
  },
  tdAccent: {
    backgroundColor: "#fff1ec",
    color: "#e8481a",
    border: "1px solid #e5e7eb",
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 900,
  },
  tdAccentRight: {
    backgroundColor: "#fff1ec",
    color: "#e8481a",
    border: "1px solid #e5e7eb",
    padding: "14px 16px",
    fontSize: 20,
    fontWeight: 900,
    textAlign: "right" as const,
  },
};

/* ── 섹션 타이틀 ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 10, borderBottom: "2px solid #e8481a", paddingBottom: 6 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{children}</h2>
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
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="modal-paper relative mx-4 w-full max-w-[800px] overflow-hidden rounded-xl shadow-2xl"
          style={{ backgroundColor: "#ffffff" }}
        >

          {/* ── 헤더 ── */}
          <div
            className="border-b px-10 py-7 text-center"
            style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.15em", color: "#1a1a1a", margin: 0 }}>
              주 문 서
            </h1>
            {order && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 13, color: "#6b7280" }}>
                <span>주문번호: <b style={{ color: "#e8481a" }}>{order.serial}</b></span>
                <span style={{ color: "#d1d5db" }}>·</span>
                <span>발행일: {new Date(order.createdAt).toLocaleDateString("ko-KR")}</span>
                <span style={{ borderRadius: 9999, padding: "2px 12px", fontSize: 12, fontWeight: 700, ...(STATUS_COLOR[order.status] ?? STATUS_COLOR.CANCELLED) }}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            )}
          </div>

          {/* ── 컨텐츠 ── */}
          <div style={{ backgroundColor: "#ffffff", padding: "8px 40px 24px" }}>

            {loading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#9ca3af" }}>
                <svg className="mr-2 animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                </svg>
                불러오는 중…
              </div>
            )}
            {error && (
              <p style={{ padding: "64px 0", textAlign: "center", fontSize: 15, color: "#ef4444" }}>{error}</p>
            )}

            {order && (
              <>
                {/* 주문 정보 */}
                <SectionTitle>주문 정보</SectionTitle>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <th style={S.thCell}>고객명</th>
                      <td style={S.tdCell}>{order.customerName}</td>
                      <th style={S.thCell}>회사명</th>
                      <td style={S.tdCell}>{order.company ?? "-"}</td>
                    </tr>
                    <tr>
                      <th style={S.thCell}>연락처</th>
                      <td style={S.tdCell}>{order.customerPhone}</td>
                      <th style={S.thCell}>이메일</th>
                      <td style={S.tdCell}>{order.customerEmail}</td>
                    </tr>
                    <tr>
                      <th style={S.thCell}>주문일</th>
                      <td style={S.tdCell}>{new Date(order.createdAt).toLocaleDateString("ko-KR")}</td>
                      <th style={S.thCell}>결제방법</th>
                      <td style={S.tdCell}>
                        {order.paymentTid
                          ? <span style={{ fontWeight: 500, color: "#2563eb" }}>카드결제 <span style={{ fontSize: 12, color: "#9ca3af" }}>({order.paymentTid})</span></span>
                          : <span style={{ fontWeight: 500, color: "#d97706" }}>계좌이체</span>
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 주문 상품 목록 */}
                <SectionTitle>주문 상품 목록 (총 {order.items.length}개)</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {order.items.map((it, idx) => {
                    const opts = it.optionsJson && typeof it.optionsJson === "object"
                      ? Object.entries(it.optionsJson as Record<string, string>)
                      : [];
                    return (
                      <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                        {/* 상품 번호 */}
                        <div style={{ backgroundColor: "#fff1ec", borderBottom: "1px solid #e5e7eb", padding: "10px 20px" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#e8481a", margin: 0 }}>
                            {idx + 1}. {it.productName}
                          </p>
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
                          <tbody>
                            <tr>
                              <th style={S.thCell}>상품명</th>
                              <td colSpan={3} style={S.tdCell}>{it.productName}</td>
                            </tr>
                            <tr>
                              <th style={S.thCell}>수량</th>
                              <td style={S.tdCell}>{it.quantity}개</td>
                              <th style={S.thCell}>금액</th>
                              <td style={{ ...S.tdCell, fontWeight: 700, color: "#e8481a" }}>
                                ₩{it.subtotal.toLocaleString()}
                              </td>
                            </tr>
                            {(opts.length > 0 || it.pageCount) && (
                              <tr>
                                <th style={S.thCell}>상세 정보</th>
                                <td colSpan={3} style={S.tdCell}>
                                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                                    {opts.map(([k, v]) => (
                                      <li key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                                        <span style={{ fontWeight: 600, color: "#6b7280" }}>{k}:</span>
                                        <span style={{ color: "#1f2937" }}>{v}</span>
                                      </li>
                                    ))}
                                    {it.pageCount && (
                                      <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                                        <span style={{ fontWeight: 600, color: "#6b7280" }}>페이지 수:</span>
                                        <span style={{ color: "#1f2937" }}>{it.pageCount}쪽</span>
                                      </li>
                                    )}
                                  </ul>
                                </td>
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
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={it.id}>
                        <th style={S.thCell}>{idx + 1}. {it.productName}</th>
                        <td style={S.tdCellRight}>₩{it.subtotal.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <th style={S.thCell}>배송비</th>
                      <td style={S.tdCellRight}>
                        {DELIVERY_LABELS[order.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? order.deliveryMethod}
                        {" / "}
                        {order.shippingFee === 0 ? "무료" : `₩${order.shippingFee.toLocaleString()}`}
                      </td>
                    </tr>
                    <tr>
                      <td style={S.tdAccent}>최종금액</td>
                      <td style={S.tdAccentRight}>₩{order.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 배송 정보 (택배/퀵) */}
                {order.deliveryMethod !== "PICKUP" && (
                  <>
                    <SectionTitle>배송 정보</SectionTitle>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <th style={S.thCell}>수령인</th>
                          <td style={S.tdCell}>{order.customerName}</td>
                          <th style={S.thCell}>연락처</th>
                          <td style={S.tdCell}>{order.customerPhone}</td>
                        </tr>
                        <tr>
                          <th style={S.thCell}>주소</th>
                          <td colSpan={3} style={S.tdCell}>{order.shippingAddress ?? "-"}</td>
                        </tr>
                        <tr>
                          <th style={S.thCell}>배송메모</th>
                          <td colSpan={3} style={{ ...S.tdCell, color: "#6b7280" }}>{order.memo ?? "없음"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                {/* 직접방문 요청사항 */}
                {order.deliveryMethod === "PICKUP" && (
                  <>
                    <SectionTitle>요청사항</SectionTitle>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, backgroundColor: "#f9fafb", padding: "16px 20px", fontSize: 14, color: "#4b5563" }}>
                      {order.memo || "없음"}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── 버튼 ── */}
          <div
            className="no-print flex justify-center gap-3 px-10 py-5"
            style={{ borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}
          >
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!order}
              style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#e8481a", color: "#ffffff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: order ? 1 : 0.4 }}
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
              style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#ffffff", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer" }}
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
