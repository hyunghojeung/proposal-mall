import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { OrderAdminActions } from "@/components/OrderAdminActions";
import { prisma } from "@/lib/prisma";
import { DELIVERY_LABELS } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  IN_PRODUCTION: "제작중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};

export default async function AdminOrderDetail({
  params,
}: {
  params: { serial: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const order = await prisma.order
    .findUnique({
      where: { serial: params.serial },
      include: { items: true },
    })
    .catch(() => null);

  if (!order) notFound();

  return (
    <AdminShell active="orders" title={`주문 ${order.serial}`}>
      <div className="mb-6 flex items-center gap-3 text-[16px]">
        <Link href="/admin/orders" className="text-ink-sub hover:text-ink">← 목록</Link>
        <span className="text-ink-del">·</span>
        <span className="rounded bg-brand-light px-3 py-1 text-[14px] font-bold text-brand">
          {STATUS_LABEL[order.status]}
        </span>
        <span className="text-[15px] text-ink-sub">
          {new Date(order.createdAt).toLocaleString("ko-KR")} 주문
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Section title="주문 상품">
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold text-ink">{it.productName}</p>
                    <p className="mt-1.5 text-[14px] text-ink-sub">
                      {it.optionsJson && typeof it.optionsJson === "object"
                        ? Object.entries(it.optionsJson as Record<string, string>)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")
                        : ""}
                      {it.pageCount ? ` · ${it.pageCount}쪽` : ""} · {it.quantity}개 · 단가 {it.unitPrice.toLocaleString()}원
                    </p>
                  </div>
                  <p className="shrink-0 text-[16px] font-bold text-ink">
                    {it.subtotal.toLocaleString()}원
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="주문자 / 배송">
            <dl className="grid gap-2 text-[16px]">
              <Row label="이름" value={order.customerName} />
              <Row label="연락처" value={order.customerPhone} />
              <Row label="이메일" value={order.customerEmail} />
              {order.company && <Row label="회사" value={order.company} />}
              <Row
                label="수령 방식"
                value={DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}
              />
              {order.shippingAddress && <Row label="배송지" value={order.shippingAddress} />}
            </dl>
            {order.memo && (
              <div className="mt-5 rounded border border-line bg-bg p-4 text-[15px]">
                <p className="mb-2 font-bold text-ink">고객 요청사항</p>
                <p className="whitespace-pre-wrap text-ink-sub">{order.memo}</p>
              </div>
            )}
          </Section>

          <Section title="결제 / 파일">
            <dl className="grid gap-2 text-[16px]">
              <Row
                label="결제수단"
                value={
                  <span className={`inline-block rounded-full px-3 py-1 text-[14px] font-bold ${
                    order.paymentTid
                      ? "border border-blue-200 bg-blue-50 text-blue-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}>
                    {order.paymentTid ? "카드 결제" : "무통장 입금"}
                  </span>
                }
              />
              <Row label="상품 합계" value={`${(order.totalAmount - order.shippingFee).toLocaleString()}원`} />
              <Row
                label="배송비"
                value={order.shippingFee === 0 ? "무료" : `${order.shippingFee.toLocaleString()}원`}
              />
              <Row label="결제 금액" value={`${order.totalAmount.toLocaleString()}원`} bold />
              {order.paymentTid && <Row label="PG 거래번호" value={order.paymentTid} />}
              <Row
                label="파일 업로드"
                value={
                  order.fileLink ? (
                    <a
                      href={order.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Dropbox 링크 열기 →
                    </a>
                  ) : (
                    "미생성"
                  )
                }
              />
            </dl>
          </Section>
        </div>

        <aside className="rounded border border-line bg-bg p-6 lg:sticky lg:top-6 lg:h-fit">
          <h2 className="mb-5 text-[18px] font-bold text-ink">관리자 작업</h2>
          <OrderAdminActions
            serial={order.serial}
            initialStatus={order.status}
            initialMemo={order.memo}
          />
        </aside>
      </div>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line bg-white p-6">
      <h2 className="mb-4 text-[18px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-ink-sub">{label}</dt>
      <dd className={`text-right ${bold ? "font-bold text-ink" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
