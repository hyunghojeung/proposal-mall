import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { OrdersListActions } from "@/components/OrdersListActions";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS } from "@/lib/pricing";

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

/* ─────────────── 결제수단 셀 ─────────────── */
function PayMethodCell({ hasTid, tid }: { hasTid: boolean; tid: string | null }) {
  if (hasTid) {
    return (
      <div>
        <div className="flex items-center gap-1">
          <span className="text-[#4ade80] text-[13px]">✓</span>
          <span className="text-white text-[14px] font-medium">카드결제</span>
        </div>
        <p className="mt-0.5 text-[12px] text-[#a0a0a8]">{tid}</p>
      </div>
    );
  }
  return <span className="text-[14px] text-[#d4d4d8]">무통장입금</span>;
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
                    ? "border-brand bg-brand-light font-bold text-brand"
                    : "border-line text-ink hover:border-ink"
                }`}
              >
                {f.label}
                {cnt > 0 && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[12px] font-bold ${
                    active ? "bg-brand text-white" : "bg-bg text-ink-sub"
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
            className="w-80 rounded border border-line px-4 py-2.5 text-[15px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded bg-ink px-5 py-2.5 text-[15px] font-medium text-white hover:bg-black"
          >
            검색
          </button>
          {q && (
            <Link
              href={statusParam !== "ALL" && statusValid ? `/admin/orders?status=${statusParam}` : "/admin/orders"}
              className="rounded border border-line px-4 py-2.5 text-[15px] text-ink-sub hover:border-ink"
            >
              초기화
            </Link>
          )}
        </form>
      </div>

      {/* ── 다크 테이블 영역 ── */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg px-4 py-16 text-center">
          <p className="text-[17px] text-ink-sub">
            {q ? `"${q}" 검색 결과가 없습니다.` : "주문이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-[#18181b]">
          {/* 테이블 헤더 바 */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#2e2e33]">
            <p className="text-[15px] font-bold text-white">
              주문 목록{" "}
              <span className="ml-1.5 rounded-full bg-[#2e2e33] px-2.5 py-0.5 text-[13px] text-[#a0a0a8]">
                {orders.length}건
              </span>
            </p>
            <p className="text-[14px] text-[#a0a0a8]">
              총 주문 금액:{" "}
              <span className="ml-1 font-bold text-white">
                ₩{grandTotal.toLocaleString()}
              </span>
            </p>
          </div>

          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-[#111114] text-[13px] text-[#8a8a92]">
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">번호</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">고객정보</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">상품</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">결제수단</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">주문상태</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold">결제금액</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">주문일</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-left font-semibold">관리</th>
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

                const deliveryLabel = DELIVERY_LABELS[o.deliveryMethod as keyof typeof DELIVERY_LABELS]
                  ?? o.deliveryMethod;

                const isPickup = o.deliveryMethod === "PICKUP";

                return (
                  <>
                    {/* ── 메인 행 ── */}
                    <tr
                      key={o.serial}
                      className="border-t border-[#2e2e33] align-middle transition-colors hover:bg-[#222226]"
                    >
                      {/* 번호 */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Link
                          href={`/admin/orders/${o.serial}`}
                          className="font-bold text-[#60a5fa] hover:underline"
                        >
                          {o.serial}
                        </Link>
                      </td>

                      {/* 고객정보 */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-white">{o.customerName}</p>
                        {o.company && (
                          <p className="text-[12px] text-[#a0a0a8]">{o.company}</p>
                        )}
                        <p className="text-[12px] text-[#a0a0a8]">{o.customerEmail}</p>
                        <p className="text-[12px] text-[#a0a0a8]">{o.customerPhone}</p>
                      </td>

                      {/* 상품 */}
                      <td className="px-5 py-3.5">
                        <p className="max-w-[220px] truncate text-[14px] text-[#d4d4d8]">
                          {productSummary}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#6b6b73]">{deliveryLabel}</p>
                      </td>

                      {/* 결제수단 */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <PayMethodCell hasTid={!!o.paymentTid} tid={o.paymentTid} />
                      </td>

                      {/* 주문상태 — 클릭으로 4단계 순환 */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <OrderStatusBadge serial={o.serial} initialStatus={o.status} />
                      </td>

                      {/* 결제금액 */}
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <span className="font-bold text-white">
                          ₩{Number(o.totalAmount).toLocaleString()}
                        </span>
                      </td>

                      {/* 주문일 */}
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[#a0a0a8]">
                        {new Date(o.createdAt).toLocaleString("ko-KR", {
                          year:   "numeric",
                          month:  "2-digit",
                          day:    "2-digit",
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* 관리 */}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <OrdersListActions serial={o.serial} status={o.status} />
                      </td>
                    </tr>

                    {/* ── 배송지 서브 행 ── */}
                    <tr
                      key={`${o.serial}-sub`}
                      className="border-t border-[#1a1a1e] bg-[#111114]"
                    >
                      <td />
                      <td colSpan={7} className="px-5 py-3 text-[12px]">
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {/* 수령인 */}
                          <span>
                            <span className="font-semibold text-[#8a8a92]">수령인:</span>{" "}
                            <span className="text-[#d4d4d8]">
                              {o.company ? `${o.company} (${o.customerName})` : o.customerName}
                            </span>
                          </span>
                          {/* 주소 */}
                          <span>
                            <span className="font-semibold text-[#8a8a92]">주소:</span>{" "}
                            <span className="text-[#d4d4d8]">
                              {isPickup ? "직접 방문 수령" : (o.shippingAddress ?? "-")}
                            </span>
                          </span>
                          {/* 배송메모 */}
                          <span>
                            <span className="font-semibold text-[#8a8a92]">배송메모:</span>{" "}
                            <span className={o.memo ? "text-[#d4d4d8]" : "text-[#4b4b52]"}>
                              {o.memo ?? "없음"}
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
