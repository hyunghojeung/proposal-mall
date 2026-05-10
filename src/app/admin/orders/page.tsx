import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { AdminOrderRow } from "@/components/AdminOrderRow";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "주문현황 | 관리자" };
export const dynamic = "force-dynamic";

/* ─────────────── 상태 필터 ─────────────── */
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL",           label: "전체" },
  { value: "PENDING",       label: "결제대기" },
  { value: "PAID",          label: "결제완료" },
  { value: "IN_PRODUCTION", label: "제작중" },
  { value: "SHIPPING",      label: "배송중" },
  { value: "DELIVERED",     label: "발송완료" },
  { value: "CANCELLED",     label: "취소" },
];


/* ─────────────── Raw SQL 결과 타입 ─────────────── */
interface OrderRow {
  id:              bigint;
  serial:          string;
  customerName:    string;
  customerPhone:   string;
  customerEmail:   string;
  company:         string | null;
  deliveryMethod:  string;
  shippingAddress: string | null;
  memo:            string | null;
  totalAmount:     bigint;
  shippingFee:     bigint;
  status:          string;
  paymentTid:      string | null;
  createdAt:       Date;
  itemCount:       bigint;
  productNames:    string | null;
}


/* ─────────────── 페이지 컴포넌트 ─────────────── */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const statusParam = searchParams.status ?? "ALL";
  const q = searchParams.q?.trim() ?? "";
  const statusValid = Object.values(OrderStatus).includes(statusParam as OrderStatus);

  /* 주문 목록 */
  const orders = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.id,
      o.serial,
      o."customerName",
      o."customerPhone",
      o."customerEmail",
      o.company,
      o."deliveryMethod",
      o."shippingAddress",
      o.memo,
      o."totalAmount",
      o."shippingFee",
      o.status,
      o."paymentTid",
      o."createdAt",
      COUNT(oi.id)                        AS "itemCount",
      STRING_AGG(oi."productName", ', ')  AS "productNames"
    FROM orders o
    LEFT JOIN order_items oi ON oi."orderId" = o.id
    WHERE
      (${statusParam} = 'ALL' OR o.status::text = ${statusParam})
      AND (
        ${q} = ''
        OR o.serial         ILIKE ${'%' + q + '%'}
        OR o."customerName"  ILIKE ${'%' + q + '%'}
        OR o."customerEmail" ILIKE ${'%' + q + '%'}
        OR o."customerPhone" LIKE  ${'%' + q + '%'}
      )
    GROUP BY o.id
    ORDER BY o."createdAt" DESC
    LIMIT 200
  `.catch((e) => {
    console.error("[admin/orders] raw query 실패:", e);
    return [] as OrderRow[];
  });

  /* 상태별 카운트 */
  const countRows = await prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
    SELECT status::text, COUNT(*) AS cnt FROM orders GROUP BY status
  `.catch(() => [] as { status: string; cnt: bigint }[]);

  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const r of countRows) {
    countMap[r.status] = Number(r.cnt);
    totalCount += Number(r.cnt);
  }

  /* 총 주문 금액 (현재 필터 기준) */
  const grandTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <AdminShell active="orders" title="주문현황">

      {/* ── 상태 필터 탭 + 검색 ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusParam === f.value;
            const href = f.value === "ALL" ? "/admin/orders" : `/admin/orders?status=${f.value}`;
            const cnt  = f.value === "ALL" ? totalCount : (countMap[f.value] ?? 0);
            return (
              <Link
                key={f.value}
                href={href}
                className={`rounded border px-5 py-2.5 text-[15px] transition-colors ${
                  active
                    ? "border-brand bg-brand/20 font-bold text-brand"
                    : "border-[#262a3d] text-[#9095b8] hover:border-[#4a5080] hover:text-white"
                }`}
              >
                {f.label}
                {cnt > 0 && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[12px] font-bold ${
                    active ? "bg-brand text-white" : "bg-[#262a3d] text-[#9095b8]"
                  }`}>
                    {cnt}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <form action="/admin/orders" className="flex gap-2">
          {statusParam !== "ALL" && statusValid && (
            <input type="hidden" name="status" value={statusParam} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder="주문번호 / 이름 / 연락처 / 이메일"
            className="w-80 rounded border border-[#262a3d] bg-[#131626] px-4 py-2.5 text-[15px] text-white placeholder:text-[#4a5070] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded bg-[#3a4060] px-5 py-2.5 text-[15px] font-normal text-white hover:bg-[#4a5080]"
          >
            검색
          </button>
          {q && (
            <Link
              href={statusParam !== "ALL" && statusValid ? `/admin/orders?status=${statusParam}` : "/admin/orders"}
              className="rounded border border-[#262a3d] px-4 py-2.5 text-[15px] text-[#8a90b0] hover:border-[#4a5080] hover:text-white"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* ── 테이블 영역 ── */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-[#262a3d] bg-[#131626] px-4 py-16 text-center">
          <p className="text-[17px] text-[#8a90b0]">
            {q ? `"${q}" 검색 결과가 없습니다.` : "주문이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-[#151829]">
          {/* 테이블 헤더 바 */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#262a3d]">
            <p className="text-[15px] font-bold text-white">
              주문 목록{" "}
              <span className="ml-1.5 rounded-full bg-[#262a3d] px-2.5 py-0.5 text-[13px] font-normal text-[#b8c0e0]">
                {orders.length}건
              </span>
            </p>
            <p className="text-[14px] text-[#b8c0e0]">
              총 주문 금액:{" "}
              <span className="ml-1 text-white">
                ₩{grandTotal.toLocaleString()}
              </span>
            </p>
          </div>

          <table className="w-full border-collapse text-[16px]">
            <thead>
              <tr className="bg-[#0f1220] text-[15px] text-[#a8b0d0]">
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">번호</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">고객정보</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">상품</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">결제수단</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">주문상태</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-normal">결제금액</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">주문일</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-normal">관리</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const names        = o.productNames ?? "";
                const firstProduct = names.split(", ")[0] ?? "";
                const extraCount   = Number(o.itemCount) - 1;
                const productSummary = firstProduct
                  ? extraCount > 0 ? `${firstProduct} 외 ${extraCount}건` : firstProduct
                  : `${Number(o.itemCount)}건`;

                return (
                  <AdminOrderRow
                    key={o.serial}
                    order={{
                      serial:          o.serial,
                      customerName:    o.customerName,
                      customerPhone:   o.customerPhone,
                      customerEmail:   o.customerEmail,
                      company:         o.company,
                      deliveryMethod:  o.deliveryMethod,
                      shippingAddress: o.shippingAddress,
                      memo:            o.memo,
                      totalAmount:     Number(o.totalAmount),
                      status:          o.status,
                      paymentTid:      o.paymentTid,
                      createdAt:       new Date(o.createdAt).toISOString(),
                      productSummary,
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
