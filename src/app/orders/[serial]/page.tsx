import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { ClearCartOnSuccess } from "@/components/ClearCartOnSuccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING: "결제대기",
  PAID: "결제완료",
  IN_PRODUCTION: "제작중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
} as const;

export async function generateMetadata({ params }: { params: { serial: string } }) {
  return { title: `주문 ${params.serial} | 제안서몰` };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { serial: string };
  searchParams: { paid?: string };
}) {
  const order = await prisma.order
    .findUnique({
      where: { serial: params.serial },
      include: { items: true },
    })
    .catch(() => null);

  if (!order) notFound();

  const justPaid = searchParams.paid === "1" && order.status === "PAID";
  const items = order.items;

  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">
        {justPaid && <ClearCartOnSuccess />}

        <nav className="flex flex-wrap items-center gap-1 pb-5 text-[13px] text-ink-sub">
          <Link href="/" className="hover:text-ink">홈</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <Link href="/orders" className="hover:text-ink">주문현황</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <span className="font-medium text-ink">{order.serial}</span>
        </nav>

        {justPaid && (
          <div className="mb-6 rounded border border-brand bg-brand-light p-5">
            <h2 className="text-[16px] font-bold text-brand">결제가 완료되었습니다</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">
              주문번호 <b>{order.serial}</b> · {order.totalAmount.toLocaleString()}원
              <br />
              파일은 안내드린 Dropbox 링크에 업로드하시거나{" "}
              <a href="mailto:blackcopy2@naver.com" className="font-bold text-brand hover:underline">
                blackcopy2@naver.com
              </a>{" "}
              으로 첨부해 주세요.
            </p>
          </div>
        )}

        <header className="border-b border-line pb-5">
          <p className="text-[13px] text-ink-sub">주문번호</p>
          <h1 className="mt-1 text-[24px] font-black tracking-tight text-ink">
            {order.serial}
          </h1>
          <p className="mt-2">
            <span className="inline-block rounded-sm bg-brand-light px-2.5 py-1 text-[12px] font-bold text-brand">
              {STATUS_LABELS[order.status]}
            </span>
          </p>
        </header>

        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-bold text-ink">주문 상품</h2>
          <ul className="space-y-2 rounded border border-line bg-white">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{it.productName}</p>
                  <p className="mt-0.5 text-[12px] text-ink-sub">
                    {it.optionsJson && typeof it.optionsJson === "object"
                      ? Object.entries(it.optionsJson as Record<string, string>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")
                      : ""}
                    {it.pageCount ? ` · ${it.pageCount}쪽` : ""} · {it.quantity}개
                  </p>
                </div>
                <p className="shrink-0 text-[14px] font-bold text-ink">
                  {it.subtotal.toLocaleString()}원
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded border border-line bg-white p-5 text-[13px]">
            <h2 className="mb-3 text-[15px] font-bold text-ink">주문자</h2>
            <Row label="이름" value={order.customerName} />
            <Row label="연락처" value={order.customerPhone} />
            <Row label="이메일" value={order.customerEmail} />
            {order.company && <Row label="회사" value={order.company} />}
          </div>

          <div className="rounded border border-line bg-white p-5 text-[13px]">
            <h2 className="mb-3 text-[15px] font-bold text-ink">결제 / 배송</h2>
            <Row
              label="수령 방식"
              value={order.deliveryMethod === "COURIER" ? "택배 배송" : "직접 방문 수령"}
            />
            {order.shippingAddress && <Row label="배송지" value={order.shippingAddress} />}
            <Row label="상품 합계" value={`${(order.totalAmount - order.shippingFee).toLocaleString()}원`} />
            <Row label="배송비" value={order.shippingFee === 0 ? "무료" : `${order.shippingFee.toLocaleString()}원`} />
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[13px] font-bold text-ink">결제 금액</span>
              <span className="text-[18px] font-black text-brand">
                {order.totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </section>

        {order.memo && (
          <section className="mt-8 rounded border border-line bg-white p-5 text-[13px]">
            <h2 className="mb-2 text-[15px] font-bold text-ink">요청사항</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-ink-sub">{order.memo}</p>
          </section>
        )}

        <div className="mt-10 flex justify-center">
          <Link
            href="/products"
            className="rounded-sm border border-line bg-white px-6 py-2.5 text-[14px] font-medium text-ink hover:border-ink"
          >
            상품 더 보기
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="text-ink-sub">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
