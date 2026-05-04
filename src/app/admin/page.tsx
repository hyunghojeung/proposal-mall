import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "관리자 | 제안서몰" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const [pending, paid, inProduction, openInquiries, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.order.count({ where: { status: "PAID" } }).catch(() => 0),
    prisma.order.count({ where: { status: "IN_PRODUCTION" } }).catch(() => 0),
    prisma.inquiry.count({ where: { status: "OPEN" } }).catch(() => 0),
    prisma.order
      .findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          serial: true,
          customerName: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      })
      .catch(() => []),
  ]);

  return (
    <AdminShell active="dashboard" title="대시보드">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="결제대기" value={pending} href="/admin/orders?status=PENDING" />
        <KpiCard label="결제완료" value={paid} href="/admin/orders?status=PAID" tone="brand" />
        <KpiCard label="제작중" value={inProduction} href="/admin/orders?status=IN_PRODUCTION" />
        <KpiCard label="미답변 문의" value={openInquiries} href="/admin/inquiries?status=OPEN" tone="brand" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-[14px] font-bold text-ink">최근 주문</h2>
        {recentOrders.length === 0 ? (
          <p className="rounded border border-line px-4 py-8 text-center text-[13px] text-ink-sub">
            아직 주문이 없습니다.
          </p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead className="border-y border-line bg-bg">
              <tr className="text-left text-[12px] text-ink-sub">
                <th className="px-3 py-2 font-medium">주문번호</th>
                <th className="px-3 py-2 font-medium">주문자</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 text-right font-medium">금액</th>
                <th className="px-3 py-2 font-medium">일시</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.serial} className="border-b border-line">
                  <td className="px-3 py-2.5 font-medium text-ink">
                    <Link href={`/admin/orders/${o.serial}`} className="hover:text-brand">
                      {o.serial}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-sub">{o.customerName}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-3 py-2.5 text-right font-medium text-ink">
                    {o.totalAmount.toLocaleString()}원
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-ink-sub">
                    {new Date(o.createdAt).toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "brand";
}) {
  return (
    <Link
      href={href}
      className="block rounded border border-line bg-white p-4 transition-colors hover:border-brand"
    >
      <p className="text-[12px] text-ink-sub">{label}</p>
      <p
        className={`mt-1 text-[24px] font-black tracking-tight ${tone === "brand" ? "text-brand" : "text-ink"}`}
      >
        {value}
      </p>
    </Link>
  );
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  IN_PRODUCTION: "제작중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-sm bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand">
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
