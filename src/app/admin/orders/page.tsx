import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus, type Prisma } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS } from "@/lib/pricing";

export const metadata = { title: "주문현황 | 관리자" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "결제대기" },
  { value: "PAID", label: "결제완료" },
  { value: "IN_PRODUCTION", label: "제작중" },
  { value: "SHIPPING", label: "배송중" },
  { value: "DELIVERED", label: "배송완료" },
  { value: "CANCELLED", label: "취소" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  IN_PRODUCTION: "제작중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const statusParam = searchParams.status;
  const q = searchParams.q?.trim();
  const where: Prisma.OrderWhereInput = {};
  if (statusParam && statusParam !== "ALL" && statusParam in OrderStatus) {
    where.status = statusParam as OrderStatus;
  }
  if (q) {
    where.OR = [
      { serial: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
    ];
  }

  const orders = await prisma.order
    .findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: { select: { id: true } } },
    })
    .catch(() => []);

  return (
    <AdminShell active="orders" title="주문현황">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => {
            const active =
              (statusParam ?? "ALL") === f.value;
            const href = f.value === "ALL" ? "/admin/orders" : `/admin/orders?status=${f.value}`;
            return (
              <Link
                key={f.value}
                href={href}
                className={`rounded-sm border px-3 py-1.5 text-[12px] transition-colors ${
                  active
                    ? "border-brand bg-brand-light font-bold text-brand"
                    : "border-line text-ink hover:border-ink"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <form action="/admin/orders" className="flex gap-2">
          {statusParam && statusParam !== "ALL" && (
            <input type="hidden" name="status" value={statusParam} />
          )}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="주문번호 / 이름 / 연락처 / 이메일"
            className="w-64 rounded-sm border border-line px-3 py-1.5 text-[12px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded-sm bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
          >
            검색
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[13px] text-ink-sub">
          조건에 맞는 주문이 없습니다.
        </p>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead className="border-y border-line bg-bg text-left text-[12px] text-ink-sub">
            <tr>
              <th className="px-3 py-2 font-medium">주문번호</th>
              <th className="px-3 py-2 font-medium">주문자</th>
              <th className="px-3 py-2 font-medium">연락처</th>
              <th className="px-3 py-2 font-medium">수령</th>
              <th className="px-3 py-2 font-medium">상품</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 text-right font-medium">금액</th>
              <th className="px-3 py-2 font-medium">일시</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.serial} className="border-b border-line align-top hover:bg-bg/40">
                <td className="px-3 py-2.5 font-medium text-ink">
                  <Link href={`/admin/orders/${o.serial}`} className="hover:text-brand">
                    {o.serial}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink">
                  {o.customerName}
                  {o.company && (
                    <p className="mt-0.5 text-[11px] text-ink-sub">{o.company}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-ink-sub">
                  {o.customerPhone}
                  <br />
                  {o.customerEmail}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-ink-sub">
                  {DELIVERY_LABELS[o.deliveryMethod]?.slice(0,2) ?? o.deliveryMethod}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-ink-sub">{o.items.length}건</td>
                <td className="px-3 py-2.5">
                  <span className="inline-block rounded-sm bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-ink">
                  {o.totalAmount.toLocaleString()}원
                </td>
                <td className="px-3 py-2.5 text-[11px] text-ink-sub">
                  {new Date(o.createdAt).toLocaleString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
