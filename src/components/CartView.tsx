"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type CartItem,
  cartSubtotal,
  readCart,
  removeFromCart,
  subscribeCart,
  updateCartQuantity,
} from "@/lib/cart";
import { shippingFee, type DeliveryMethod, DELIVERY_LABELS } from "@/lib/pricing";
import { QuoteModal } from "@/components/QuoteModal";

export function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>("COURIER_PREPAID");
  const [showQuote, setShowQuote] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
    const saved = localStorage.getItem("cart_delivery") as DeliveryMethod | null;
    if (saved) setDelivery(saved);
    return subscribeCart(() => setItems(readCart()));
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("cart_delivery", delivery);
  }, [delivery, hydrated]);

  if (!hydrated) {
    return <p className="py-16 text-center text-[16px] text-ink-sub">불러오는 중…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-5 text-[17px] text-ink-sub">장바구니가 비어 있습니다.</p>
        <Link
          href="/products"
          className="inline-block rounded bg-brand px-6 py-3 text-[16px] font-bold text-white hover:bg-brand-dark"
        >
          상품 둘러보기
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const fee = shippingFee(subtotal, delivery);
  const total = subtotal + fee;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <ul className="space-y-4">
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded border border-line bg-white p-6 sm:flex sm:items-start sm:gap-5"
          >
            <div className="flex-1">
              <h3 className="text-[17px] font-bold text-ink">{it.productName}</h3>
              <p className="mt-1.5 text-[14px] text-ink-sub">
                {Object.entries(it.options)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
                {it.pageCount ? ` · ${it.pageCount}쪽` : ""}
              </p>

              <div className="mt-4 flex items-stretch overflow-hidden rounded border border-line w-fit">
                <button
                  type="button"
                  onClick={() => updateCartQuantity(it.id, it.quantity - 1)}
                  className="px-4 py-2 text-[16px] text-ink hover:bg-bg"
                  aria-label="수량 감소"
                >
                  −
                </button>
                <span className="flex w-14 items-center justify-center text-[15px]">
                  {it.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartQuantity(it.id, it.quantity + 1)}
                  className="px-4 py-2 text-[16px] text-ink hover:bg-bg"
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-[13px] text-ink-del">
                ※ 수량 변경 시 단가 재계산은 다음 단계에서 적용됩니다 (현재는 단가 고정).
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between sm:mt-0 sm:flex-col sm:items-end">
              <p className="text-[18px] font-bold text-ink">
                {it.subtotal.toLocaleString()}원
              </p>
              <button
                type="button"
                onClick={() => removeFromCart(it.id)}
                className="mt-2 text-[14px] text-ink-sub underline-offset-2 hover:text-brand hover:underline"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded border border-line bg-white p-7">
        <h2 className="text-[20px] font-bold text-ink">주문 요약</h2>

        <div className="mt-5 space-y-3 border-t border-line pt-5 text-[15px]">
          <div className="flex justify-between">
            <span className="text-ink-sub">상품 합계</span>
            <span className="font-medium text-ink">{subtotal.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-sub">배송비</span>
            <span className="font-medium text-ink">
              {fee === 0 ? "무료" : `${fee.toLocaleString()}원`}
            </span>
          </div>
          {(delivery === "COURIER_COLLECT" || delivery === "QUICK_COLLECT") && (
            <p className="text-[13px] text-ink-sub">배송비는 수령 시 별도 적용됩니다.</p>
          )}
        </div>

        <fieldset className="mt-5 border-t border-line pt-5">
          <legend className="mb-3 text-[15px] font-bold text-ink">수령 방식</legend>
          <div className="space-y-2.5">
            {(
              [
                { value: "COURIER_PREPAID", desc: "5,000원" },
                { value: "COURIER_COLLECT", desc: "착불 — 수령 시 지불" },
                { value: "QUICK_COLLECT",   desc: "착불 — 수령 시 지불" },
                { value: "PICKUP",          desc: "무료" },
              ] as { value: DeliveryMethod; desc: string }[]
            ).map(({ value, desc }) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 text-[15px]">
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === value}
                  onChange={() => setDelivery(value)}
                  className="accent-[#E8481A]"
                />
                <span className="font-medium text-ink">{DELIVERY_LABELS[value]}</span>
                <span className="text-ink-sub">({desc})</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-[16px] font-bold text-ink">총 결제 금액</span>
          <span className="text-[26px] font-black tracking-tight text-brand">
            {total.toLocaleString()}원
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="mt-5 w-full rounded bg-brand py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          결제하기
        </button>
        <p className="mt-2 text-center text-[13px] text-ink-sub">
          다음 단계에서 주문자 정보를 입력하고 결제까지 완료합니다.
        </p>

        <button
          type="button"
          onClick={() => setShowQuote(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-line py-3 text-[15px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          견적서 출력
        </button>
      </aside>

      {showQuote && (
        <QuoteModal
          items={items}
          delivery={delivery}
          onClose={() => setShowQuote(false)}
        />
      )}
    </div>
  );
}
