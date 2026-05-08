import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS } from "@/lib/pricing";

export const metadata = { title: "주문현황 | 관리자" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL",           label: "전체" },
  { value: "PENDING",       label: "결제대기" },
  { value: "PAID",          label: "결제완료" },
  { value: "IN_PRODUCTION", label: "제작중" },
  { value: "SHIPPING",      label: "배송중" },
  { value: "DELIVERED",     label: "배송완료" },
  { value: "CANCELLED",     label: "취소" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:       { label: "결제대기", cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  PAID:          { label: "결제완료", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  IN_PRODUCTION: { label: "제작중",   cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  SHIPPING:      { label: "배송중",   cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  DELIVERED:     { label: "배송완료", cls: "bg-green-50 text-green-700 border border-green-200" },
  CANCELLED:     { label: "취소",     cls: "bg-gray-100 text-gray-500 border border-gray-200" },
};

// Raw SQL 결과 타입
interface OrderRow {
  id:             bigint;
  serial:         string;
  customerName:   string;
  customerPhone:  string;
  customerEmail:  string;
  company:        string | null;
  deliveryMethod: string;
  totalAmount:    bigint;
  shippingFee:    bigint;
  status:         string;
  paymentTid:     string | null;
  createdAt:      Date;
  itemCount:      bigint;
  productNames:   string | null;
}

function PayBadge({ hasTid }: { hasTid: boolean }) {
  return hasTid ? (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">카드</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">무통장</span>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const statusParam = searchParams.status ?? "ALL";
  const q = searchParams.q?.trim() ?? "";

  // ── Raw SQL: Prisma 스키마 컬럼 불일치 문제 완전 우회 ──
  const statusValid = Object.values(OrderStatus).includes(statusParam as OrderStatus);

  const orders = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.id,
      o.serial,
      o."customerName",
      o."customerPhone",
      o."customerEmail",
      o.company,
      o."deliveryMethod",
      o."totalAmount",
      o."shippingFee",
      o.status,
      o."paymentTid",
      o."createdAt",
      COUNT(oi.id)                          AS "itemCount",
      STRING_AGG(oi."productName", ', ')    AS "productNames"
    FROM orders o
    LEFT JOIN order_items oi ON oi."orderId" = o.id
    WHERE
      (${statusParam} = 'ALL' OR o.status::text = ${statusParam})
      AND (
        ${q} = ''
        OR o.serial        ILIKE ${'%' + q + '%'}
        OR o."customerName" ILIKE ${'%' + q + '%'}
        OR o."customerEmail" ILIKE ${'%' + q + '%'}
        OR o."customerPhone" LIKE ${'%' + q + '%'}
      )
    GROUP BY o.id
    ORDER BY o."createdAt" DESC
    LIMIT 200
  `.catch((e) => {
    console.error("[admin/orders] raw query 실패:", e);
    return [] as OrderRow[];
  });

  // 상태별 카운트 (raw)
  const countRows = await prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
    SELECT status::text, COUNT(*) AS cnt FROM orders GROUP BY status
  `.catch(() => [] as { status: string; cnt: bigint }[]);

  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const r of countRows) {
    countMap[r.status] = Number(r.cnt);
    totalCount += Number(r.cnt);
  }

  return (
    <AdminShell active="orders" title="주문현황">

      {/* 상태 필터 탭 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusParam === f.value;
            const href = f.value === "ALL" ? "/admin/orders" : `/admin/orders?status=${f.value}`;
            const cnt = f.value === "ALL" ? totalCount : (countMap[f.value] ?? 0);
            return (
              <Link
                key={f.value}
                href={href}
                className={`rounded border px-3 py-1.5 text-[12px] transition-colors ${
                  active
                    ? "border-brand bg-brand-light font-bold text-brand"
                    : "border-line text-ink hover:border-ink"
                }`}
              >
                {f.label}
                {cnt > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-brand text-white" : "bg-bg text-ink-sub"
                  }`}>
                    {cnt}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* 검색 */}
        <form action="/admin/orders" className="flex gap-2">
          {statusParam !== "ALL" && statusValid && (
            <input type="hidden" name="status" value={statusParam} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder="주문번호 / 이름 / 연락처 / 이메일"
            className="w-64 rounded border border-line px-3 py-1.5 text-[12px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
          >
            검색
          </button>
          {q && (
            <Link
              href={statusParam !== "ALL" && statusValid ? `/admin/orders?status=${statusParam}` : "/admin/orders"}
              className="rounded border border-line px-3 py-1.5 text-[12px] text-ink-sub hover:border-ink"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* 주문 테이블 */}
      {orders.length === 0 ? (
        <div className="rounded border border-line bg-bg px-4 py-16 text-center">
          <p className="text-[14px] text-ink-sub">
            {q ? `"${q}" 검색 결과가 없습니다.` : "주문이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-line bg-bg text-left text-[12px] text-ink-sub">
                <th className="px-3 py-2.5 font-medium">주문번호</th>
                <th className="px-3 py-2.5 font-medium">주문자</th>
                <th className="px-3 py-2.5 font-medium">연락처 / 이메일</th>
                <th className="px-3 py-2.5 font-medium">결제</th>
                <th className="px-3 py-2.5 font-medium">상품</th>
                <th className="px-3 py-2.5 font-medium">수령</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 text-right font-medium">금액</th>
                <th className="px-3 py-2.5 font-medium">주문일시</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = STATUS_BADGE[o.status] ?? { label: o.status, cls: "bg-bg text-ink-sub border border-line" };
                const names = o.productNames ?? "";
                const firstProduct = names.split(", ")[0] ?? "";
                const extraCount = Number(o.itemCount) - 1;
                const productSummary = firstProduct
                  ? extraCount > 0 ? `${firstProduct} 외 ${extraCount}건` : firstProduct
                  : `${Number(o.itemCount)}건`;

                return (
                  <tr key={o.serial} className="border-b border-line align-middle hover:bg-bg/50">
                    <td className="px-3 py-3">
                      <Link href={`/admin/orders/${o.serial}`} className="font-bold text-brand hover:underline">
                        {o.serial}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-ink">{o.customerName}</span>
                      {o.company && <p className="mt-0.5 text-[11px] text-ink-sub">{o.company}</p>}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-ink-sub">
                      <p>{o.customerPhone}</p>
                      <p className="mt-0.5">{o.customerEmail}</p>
                    </td>
                    <td className="px-3 py-3">
                      <PayBadge hasTid={!!o.paymentTid} />
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      <span className="block truncate text-[12px] text-ink-sub">{productSummary}</span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-ink-sub">
                      {DELIVERY_LABELS[o.deliveryMethod as keyof typeof DELIVERY_LABELS] ?? o.deliveryMethod}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-ink">
                      {Number(o.totalAmount).toLocaleString()}원
                    </td>
                    <td className="px-3 py-3 text-[11px] text-ink-sub">
                      {new Date(o.createdAt).toLocaleString("ko-KR", {
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
