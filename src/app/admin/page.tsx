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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="결제대기" value={pending} href="/admin/orders?status=PENDING" />
        <KpiCard label="결제완료" value={paid} href="/admin/orders?status=PAID" tone="brand" />
        <KpiCard label="제작중" value={inProduction} href="/admin/orders?status=IN_PRODUCTION" />
        <KpiCard label="미답변 문의" value={openInquiries} href="/admin/inquiries?status=OPEN" tone="brand" />
      </div>

      <section className="mt-9">
        <h2 className="mb-4 text-[16px] font-bold text-ink">최근 주문</h2>
        {recentOrders.length === 0 ? (
          <p className="rounded border border-line px-4 py-10 text-center text-[14px] text-ink-sub">
            아직 주문이 없습니다.
          </p>
        ) : (
          <table className="w-full border-collapse text-[14px]">
            <thead className="border-y border-line bg-bg">
              <tr className="text-left text-[13px] text-ink-sub">
                <th className="px-4 py-3 font-semibold">주문번호</th>
                <th className="px-4 py-3 font-semibold">주문자</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 text-right font-semibold">금액</th>
                <th className="px-4 py-3 font-semibold">일시</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.serial} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    <Link href={`/admin/orders/${o.serial}`} className="hover:text-brand">
                      {o.serial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-sub">{o.customerName}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-ink">
                    {o.totalAmount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-sub">
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
      className="block rounded border border-line bg-white p-5 transition-colors hover:border-brand"
    >
      <p className="text-[13px] text-ink-sub">{label}</p>
      <p
        className={`mt-1.5 text-[28px] font-black tracking-tight ${tone === "brand" ? "text-brand" : "text-ink"}`}
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
    <span className="inline-block rounded bg-brand-light px-2.5 py-1 text-[12px] font-bold text-brand">
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
