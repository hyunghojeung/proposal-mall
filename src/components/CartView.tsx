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
import { shippingFee, FREE_SHIPPING_THRESHOLD, type DeliveryMethod, DELIVERY_LABELS } from "@/lib/pricing";

export function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>("COURIER_PREPAID");

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
    // localStorage에서 이전에 선택한 배송방법 복원
    const saved = localStorage.getItem("cart_delivery") as DeliveryMethod | null;
    if (saved) setDelivery(saved);
    return subscribeCart(() => setItems(readCart()));
  }, []);

  // 배송방법 변경 시 localStorage에 저장
  useEffect(() => {
    if (hydrated) localStorage.setItem("cart_delivery", delivery);
  }, [delivery, hydrated]);

  if (!hydrated) {
    return <p className="py-16 text-center text-[14px] text-ink-sub">불러오는 중…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-[15px] text-ink-sub">장바구니가 비어 있습니다.</p>
        <Link
          href="/products"
          className="inline-block rounded-sm bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
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
      <ul className="space-y-3">
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded border border-line bg-white p-5 sm:flex sm:items-start sm:gap-5"
          >
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-ink">{it.productName}</h3>
              <p className="mt-1 text-[12px] text-ink-sub">
                {Object.entries(it.options)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
                {it.pageCount ? ` · ${it.pageCount}쪽` : ""}
              </p>

              <div className="mt-3 flex items-stretch overflow-hidden rounded-sm border border-line w-fit">
                <button
                  type="button"
                  onClick={() => updateCartQuantity(it.id, it.quantity - 1)}
                  className="px-3 py-1.5 text-ink hover:bg-bg"
                  aria-label="수량 감소"
                >
                  −
                </button>
                <span className="flex w-12 items-center justify-center text-[13px]">
                  {it.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartQuantity(it.id, it.quantity + 1)}
                  className="px-3 py-1.5 text-ink hover:bg-bg"
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-[11px] text-ink-del">
                ※ 수량 변경 시 단가 재계산은 다음 단계에서 적용됩니다 (현재는 단가 고정).
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between sm:mt-0 sm:flex-col sm:items-end">
              <p className="text-[16px] font-bold text-ink">
                {it.subtotal.toLocaleString()}원
              </p>
              <button
                type="button"
                onClick={() => removeFromCart(it.id)}
                className="mt-2 text-[12px] text-ink-sub underline-offset-2 hover:text-brand hover:underline"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded border border-line bg-white p-6">
        <h2 className="text-[16px] font-bold text-ink">주문 요약</h2>

        <div className="mt-5 space-y-2 border-t border-line pt-5 text-[13px]">
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
          {delivery === "COURIER_PREPAID" && subtotal < FREE_SHIPPING_THRESHOLD && (
            <p className="text-[11px] text-ink-sub">
              {(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString()}원 추가 시 무료배송
            </p>
          )}
          {(delivery === "COURIER_COLLECT" || delivery === "QUICK_COLLECT" || delivery === "QUICK_PREPAID") && (
            <p className="text-[11px] text-ink-sub">배송비는 수령 시 별도 적용됩니다.</p>
          )}
        </div>

        <fieldset className="mt-5 border-t border-line pt-5">
          <legend className="mb-3 text-[13px] font-bold text-ink">수령 방식</legend>
          <div className="space-y-2">
            {(
              [
                { value: "COURIER_PREPAID", desc: "3,000원 (30,000원↑ 무료)" },
                { value: "COURIER_COLLECT", desc: "착불 — 수령 시 지불" },
                { value: "QUICK_PREPAID",   desc: "실비 — 별도 안내" },
                { value: "QUICK_COLLECT",   desc: "착불 — 수령 시 지불" },
                { value: "PICKUP",          desc: "무료" },
              ] as { value: DeliveryMethod; desc: string }[]
            ).map(({ value, desc }) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-[13px]">
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
          <span className="text-[14px] font-bold text-ink">총 결제 금액</span>
          <span className="text-[22px] font-black tracking-tight text-brand">
            {total.toLocaleString()}원
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push("/checkout")}
          className="mt-5 w-full rounded-sm bg-brand py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          결제하기
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-sub">
          다음 단계에서 주문자 정보를 입력하고 결제까지 완료합니다.
        </p>
      </aside>
    </div>
  );
}
