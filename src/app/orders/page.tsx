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
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/* ──────────────────────────────────────────
   상태 배지 정의 (서비스 색상 통일)
────────────────────────────────────────── */
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:       { label: "결제대기", cls: "bg-amber-50  border border-amber-300  text-amber-700" },
  PAID:          { label: "결제완료", cls: "bg-blue-50   border border-blue-300   text-blue-700"  },
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

      <main className="mx-auto min-h-[60vh] max-w-[1400px] px-6 py-10">

        {/* ── 페이지 타이틀 + 검색 ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-ink">주문현황</h1>
            <p className="mt-1 text-[14px] text-ink-sub">
              실시간 제작·배송 현황을 확인하세요. 개인정보는 일부 가려져 표시됩니다.
            </p>
          </div>

          {/* 검색 */}
          <form action="/orders" className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="주문번호 · 이름 · 연락처"
              className="w-64 rounded border border-line bg-white px-4 py-2.5 text-[15px] outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="rounded bg-brand px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark"
            >
              검색
            </button>
            {q && (
              <Link
                href="/orders"
                className="rounded border border-line px-4 py-2.5 text-[14px] text-ink-sub hover:border-ink"
              >
                초기화
              </Link>
            )}
          </form>
        </div>

        {/* ── 테이블 ── */}
        {orders.length === 0 ? (
          <div className="rounded-xl border border-line bg-bg py-16 text-center">
            <p className="text-[17px] text-ink-sub">
              {q ? `"${q}" 검색 결과가 없습니다.` : "주문 내역이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
            {/* 상단 바 */}
            <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-3.5">
              <p className="text-[14px] text-ink-sub">
                총{" "}
                <span className="font-bold text-ink">{orders.length}건</span>
                의 주문 (최근 200건)
              </p>
              <p className="text-[13px] text-ink-del">
                ※ 이름·연락처·이메일은 개인정보 보호를 위해 일부 가려집니다
              </p>
            </div>

            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line bg-bg text-[13px] text-ink-sub">
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">주문번호</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">주문자</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">연락처 / 이메일</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">결제</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">상품</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">수령</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">상태</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold">금액</th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">주문일시</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const badge = STATUS_BADGE[o.status] ??
                    { label: o.status, cls: "bg-gray-100 border border-gray-300 text-gray-500" };

                  const payKey   = o.paymentTid ? "card" : "bank";
                  const payLabel = o.paymentTid ? "카드" : "무통장";
                  const payCls   = PAY_BADGE[payKey];

                  const names   = o.productNames ?? "";
                  const first   = names.split(", ")[0] ?? "";
                  const extra   = Number(o.itemCount) - 1;
                  const summary = first
                    ? extra > 0 ? `${first} 외 ${extra}건` : first
                    : `${Number(o.itemCount)}건`;

                  const delivery = DELIVERY_LABELS[o.deliveryMethod as keyof typeof DELIVERY_LABELS]
                    ?? o.deliveryMethod;

                  return (
                    <tr
                      key={o.serial}
                      className="border-b border-line transition-colors hover:bg-[#fff8f6]"
                    >
                      {/* 주문번호 */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link
                          href={`/orders/${o.serial}`}
                          className="font-black text-brand hover:underline"
                        >
                          {o.serial}
                        </Link>
                      </td>

                      {/* 주문자 */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-bold text-ink">{maskName(o.customerName)}</p>
                        {o.company && (
                          <p className="mt-0.5 text-[12px] text-ink-sub">{o.company}</p>
                        )}
                      </td>

                      {/* 연락처 / 이메일 */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="text-ink-sub">{maskPhone(o.customerPhone)}</p>
                        <p className="mt-0.5 text-[12px] text-ink-del">{maskEmail(o.customerEmail)}</p>
                      </td>

                      {/* 결제 */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${payCls}`}>
                          {payLabel}
                        </span>
                      </td>

                      {/* 상품 */}
                      <td className="px-5 py-4">
                        <span className="block max-w-[220px] truncate text-[14px] text-ink">
                          {summary}
                        </span>
                      </td>

                      {/* 수령 */}
                      <td className="whitespace-nowrap px-5 py-4 text-[13px] text-ink-sub">
                        {delivery}
                      </td>

                      {/* 상태 */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* 금액 */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="font-bold text-ink">
                          {Number(o.totalAmount).toLocaleString()}원
                        </span>
                      </td>

                      {/* 주문일시 */}
                      <td className="whitespace-nowrap px-5 py-4 text-[13px] text-ink-del">
                        {new Date(o.createdAt).toLocaleString("ko-KR", {
                          month:  "2-digit",
                          day:    "2-digit",
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 안내 문구 */}
        <p className="mt-5 text-center text-[13px] text-ink-sub">
          주문번호 클릭 시 상세 내역을 확인할 수 있습니다.&nbsp;
          문의: <a href="mailto:blackcopy2@naver.com" className="text-brand hover:underline">blackcopy2@naver.com</a>
        </p>
      </main>

      <Footer />
    </>
  );
}
