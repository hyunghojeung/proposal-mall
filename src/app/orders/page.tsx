import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS } from "@/lib/pricing";

export const metadata = { title: "주문현황 | 제안서박스몰" };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────
   개인정보 마스킹 유틸
────────────────────────────────────────── */
function maskName(name: string): string {
  if (!name) return "-";
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
function maskPhone(phone: string): string {
  if (!phone) return "-";
  const parts = phone.split("-");
  if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
  if (phone.length > 7) return phone.slice(0, 3) + "-****-" + phone.slice(-4);
  return phone;
}
function maskEmail(email: string): string {
  if (!email) return "-";
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local  = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

/* ──────────────────────────────────────────
   상태 배지
────────────────────────────────────────── */
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:       { label: "결제대기", cls: "bg-amber-50  border border-amber-300  text-amber-700"  },
  PAID:          { label: "결제완료", cls: "bg-blue-50   border border-blue-300   text-blue-700"   },
  IN_PRODUCTION: { label: "제작중",   cls: "bg-orange-50 border border-orange-300 text-[#E8481A]"  },
  SHIPPING:      { label: "배송중",   cls: "bg-purple-50 border border-purple-300 text-purple-700" },
  DELIVERED:     { label: "발송완료", cls: "bg-green-50  border border-green-300  text-green-700"  },
  CANCELLED:     { label: "취소",     cls: "bg-gray-100  border border-gray-300   text-gray-500"   },
};
const PAY_BADGE: Record<string, string> = {
  card: "bg-blue-50  border border-blue-300  text-blue-700",
  bank: "bg-amber-50 border border-amber-300 text-amber-700",
};

/* ──────────────────────────────────────────
   Raw SQL 결과 타입
────────────────────────────────────────── */
interface OrderRow {
  serial:         string;
  customerName:   string;
  customerPhone:  string;
  customerEmail:  string;
  company:        string | null;
  deliveryMethod: string;
  totalAmount:    bigint;
  status:         string;
  paymentTid:     string | null;
  createdAt:      Date;
  itemCount:      bigint;
  productNames:   string | null;
}

/* ──────────────────────────────────────────
   페이지
────────────────────────────────────────── */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";

  const orders = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.serial,
      o."customerName",
      o."customerPhone",
      o."customerEmail",
      o.company,
      o."deliveryMethod",
      o."totalAmount",
      o.status,
      o."paymentTid",
      o."createdAt",
      COUNT(oi.id)                        AS "itemCount",
      STRING_AGG(oi."productName", ', ')  AS "productNames"
    FROM orders o
    LEFT JOIN order_items oi ON oi."orderId" = o.id
    WHERE
      o.status != 'CANCELLED'
      AND (
        ${q} = ''
        OR o.serial          ILIKE ${'%' + q + '%'}
        OR o."customerName"   ILIKE ${'%' + q + '%'}
        OR o."customerPhone"  LIKE  ${'%' + q + '%'}
      )
    GROUP BY o.id
    ORDER BY o."createdAt" DESC
    LIMIT 200
  `.catch(() => [] as OrderRow[]);

  return (
    <>
      <NoticeBar />
      <Header />

      <main className="mx-auto min-h-[60vh] w-full max-w-[1200px] px-4 py-6 md:px-6 md:py-10">

        {/* ── 타이틀 ── */}
        <div className="mb-5">
          <h1 className="text-[22px] font-black tracking-tight text-ink md:text-[28px]">주문현황</h1>
          <p className="mt-1 text-[13px] text-ink-sub">
            실시간 제작·배송 현황 · 개인정보는 일부 가려져 표시됩니다
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-brand">
            주문번호를 누르면 상세 내역을 확인할 수 있습니다
          </p>
        </div>

        {/* ── 검색 ── */}
        <form action="/orders" className="mb-5 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="주문번호 · 이름 · 연락처"
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-[14px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
          >
            검색
          </button>
          {q && (
            <Link
              href="/orders"
              className="shrink-0 rounded-lg border border-line px-4 py-2.5 text-[13px] text-ink-sub hover:border-ink"
            >
              초기화
            </Link>
          )}
        </form>

        {/* ── 결과 영역 ── */}
        {orders.length === 0 ? (
          <div className="rounded-xl border border-line bg-bg py-16 text-center">
            <p className="text-[16px] text-ink-sub">
              {q ? `"${q}" 검색 결과가 없습니다.` : "주문 내역이 없습니다."}
            </p>
          </div>
        ) : (
          <>
            {/* 건수 요약 */}
            <p className="mb-3 text-[13px] text-ink-sub">
              총 <span className="font-bold text-ink">{orders.length}건</span>
              <span className="ml-1 text-ink-del">(최근 200건)</span>
            </p>

            {/* ════════════════════════════════
                모바일 카드 목록  (md 미만)
            ════════════════════════════════ */}
            <div className="flex flex-col gap-3 md:hidden">
              {orders.map((o) => {
                const badge    = STATUS_BADGE[o.status] ?? { label: o.status, cls: "bg-gray-100 border border-gray-300 text-gray-500" };
                const payLabel = o.paymentTid ? "카드" : "무통장";
                const payCls   = PAY_BADGE[o.paymentTid ? "card" : "bank"];
                const names    = o.productNames ?? "";
                const first    = names.split(", ")[0] ?? "";
                const extra    = Number(o.itemCount) - 1;
                const summary  = first ? (extra > 0 ? `${first} 외 ${extra}건` : first) : `${Number(o.itemCount)}건`;
                const delivery = DELIVERY_LABELS[o.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? o.deliveryMethod;
                const dateStr  = new Date(o.createdAt).toLocaleString("ko-KR", {
                  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                });

                return (
                  <Link
                    key={o.serial}
                    href={`/orders/${o.serial}`}
                    className="block overflow-hidden rounded-xl border border-line bg-white shadow-sm active:bg-brand-light"
                  >
                    {/* 카드 상단 — 주문번호 + 상태 */}
                    <div className="flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3">
                      <span className="text-[15px] font-black tracking-tight text-brand">{o.serial}</span>
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-[12px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* 카드 본문 */}
                    <div className="px-4 py-3.5 space-y-2">
                      {/* 상품명 */}
                      <p className="truncate text-[14px] font-bold text-ink">{summary}</p>

                      {/* 주문자 */}
                      <p className="text-[13px] text-ink-sub">
                        {maskName(o.customerName)}
                        {o.company ? <span className="ml-1 text-ink-del">· {o.company}</span> : null}
                        <span className="ml-2 text-ink-del">{maskPhone(o.customerPhone)}</span>
                      </p>

                      {/* 하단 메타 — 결제·배송·금액·날짜 */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${payCls}`}>
                            {payLabel}
                          </span>
                          <span className="text-[12px] text-ink-sub">{delivery}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-black text-ink">
                            {Number(o.totalAmount).toLocaleString()}원
                          </p>
                          <p className="text-[11px] text-ink-del">{dateStr}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ════════════════════════════════
                데스크탑 테이블  (md 이상)
            ════════════════════════════════ */}
            <div className="hidden overflow-x-auto rounded-xl border border-line bg-white shadow-sm md:block">
              {/* 헤더 바 */}
              <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-3">
                <p className="text-[13px] text-ink-sub">
                  총 <span className="font-bold text-ink">{orders.length}건</span>
                </p>
                <p className="text-[12px] text-ink-del">
                  ※ 이름·연락처·이메일은 개인정보 보호를 위해 일부 가려집니다
                </p>
              </div>

              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-bg text-[12px] text-ink-sub">
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[96px]">주문번호</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[90px]">주문자</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[150px]">연락처 / 이메일</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[60px]">결제</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">상품</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[80px]">수령</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[72px]">상태</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold w-[100px]">금액</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold w-[90px]">주문일시</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const badge    = STATUS_BADGE[o.status] ?? { label: o.status, cls: "bg-gray-100 border border-gray-300 text-gray-500" };
                    const payLabel = o.paymentTid ? "카드" : "무통장";
                    const payCls   = PAY_BADGE[o.paymentTid ? "card" : "bank"];
                    const names    = o.productNames ?? "";
                    const first    = names.split(", ")[0] ?? "";
                    const extra    = Number(o.itemCount) - 1;
                    const summary  = first ? (extra > 0 ? `${first} 외 ${extra}건` : first) : `${Number(o.itemCount)}건`;
                    const delivery = DELIVERY_LABELS[o.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? o.deliveryMethod;

                    return (
                      <tr key={o.serial} className="border-b border-line transition-colors hover:bg-[#fff8f6]">
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <Link href={`/orders/${o.serial}`} className="font-black text-brand hover:underline">
                            {o.serial}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <p className="font-bold text-ink">{maskName(o.customerName)}</p>
                          {o.company && <p className="mt-0.5 text-[11px] text-ink-sub truncate max-w-[80px]">{o.company}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <p className="text-ink-sub">{maskPhone(o.customerPhone)}</p>
                          <p className="mt-0.5 text-[11px] text-ink-del">{maskEmail(o.customerEmail)}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${payCls}`}>
                            {payLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <Link href={`/orders/${o.serial}`}
                            className="block max-w-[160px] truncate text-[13px] text-ink hover:text-brand hover:underline">
                            {summary}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-ink-sub">{delivery}</td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right">
                          <span className="font-bold text-ink">
                            {Number(o.totalAmount).toLocaleString()}원
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[12px] text-ink-del">
                          {new Date(o.createdAt).toLocaleString("ko-KR", {
                            month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="mt-5 text-center text-[12px] text-ink-sub">
          문의: <a href="mailto:blackcopy2@naver.com" className="text-brand hover:underline">blackcopy2@naver.com</a>
        </p>
      </main>

      <Footer />
    </>
  );
}
