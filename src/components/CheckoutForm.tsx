"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CartItem,
  cartSubtotal,
  readCart,
  subscribeCart,
} from "@/lib/cart";
import { shippingFee } from "@/lib/pricing";

interface CheckoutResp {
  order?: { serial: string; totalAmount: number };
  payment?: {
    adapter: string;
    redirectUrl?: string;
    formAction?: { url: string; method: "POST" | "GET"; fields: Record<string, string> };
    testCompletedUrl?: string;
  };
  error?: string;
}

export function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const failReason = searchParams.get("fail");

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [company, setCompany] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"COURIER" | "PICKUP">("COURIER");
  const [shippingAddress, setShippingAddress] = useState("");
  const [memo, setMemo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
    return subscribeCart(() => setItems(readCart()));
  }, []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const fee = shippingFee(subtotal, deliveryMethod);
  const total = subtotal + fee;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setErr("장바구니가 비어 있습니다.");
      return;
    }
    setSubmitting(true);
    setErr(null);

    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          company: company || undefined,
          deliveryMethod,
          shippingAddress: deliveryMethod === "COURIER" ? shippingAddress : undefined,
          memo: memo || undefined,
          items: items.map((it) => ({
            slug: it.slug,
            options: it.options,
            quantity: it.quantity,
            pageCount: it.pageCount,
          })),
        }),
      });
      const data = (await res.json()) as CheckoutResp;
      if (!res.ok) {
        setErr(data.error ?? "결제 요청 실패");
        setSubmitting(false);
        return;
      }
      const payment = data.payment;
      if (!payment) {
        setErr("결제 정보가 없습니다");
        setSubmitting(false);
        return;
      }
      if (payment.testCompletedUrl) {
        // stub: 즉시 성공 URL로 이동
        window.location.href = payment.testCompletedUrl;
        return;
      }
      if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
        return;
      }
      if (payment.formAction) {
        // POST 자동 제출 폼 생성
        const form = document.createElement("form");
        form.action = payment.formAction.url;
        form.method = payment.formAction.method;
        for (const [k, v] of Object.entries(payment.formAction.fields)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      setErr("결제 응답을 처리할 수 없습니다");
      setSubmitting(false);
    } catch {
      setErr("네트워크 오류");
      setSubmitting(false);
    }
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-[15px] text-ink-sub">장바구니가 비어 결제할 수 없습니다.</p>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="rounded-sm bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
        >
          상품 둘러보기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-7">
        {failReason && (
          <div className="rounded border border-brand bg-brand-light px-4 py-3 text-[13px] text-brand">
            결제가 완료되지 않았습니다 ({failReason}). 다시 시도해 주세요.
          </div>
        )}

        <fieldset>
          <legend className="mb-3 text-[15px] font-bold text-ink">주문자 정보</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="이름" required>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                maxLength={100}
                className="w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </Field>
            <Field label="연락처" required>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                maxLength={40}
                placeholder="010-0000-0000"
                className="w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </Field>
            <Field label="이메일" required>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                className="w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </Field>
            <Field label="회사명">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={100}
                className="w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[15px] font-bold text-ink">수령 방식</legend>
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-line px-4 py-3 text-[14px] hover:border-ink">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "COURIER"}
                onChange={() => setDeliveryMethod("COURIER")}
                className="accent-[#E8481A]"
              />
              <span className="font-medium">택배 배송</span>
              <span className="ml-auto text-[12px] text-ink-sub">2,500원 (30,000원↑ 무료)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-line px-4 py-3 text-[14px] hover:border-ink">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "PICKUP"}
                onChange={() => setDeliveryMethod("PICKUP")}
                className="accent-[#E8481A]"
              />
              <span className="font-medium">직접 방문 수령</span>
              <span className="ml-auto text-[12px] text-ink-sub">무료</span>
            </label>
          </div>
          {deliveryMethod === "COURIER" && (
            <Field label="배송지 주소" required>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
                rows={2}
                maxLength={500}
                className="mt-2 w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
              />
            </Field>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[15px] font-bold text-ink">요청사항 (선택)</legend>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="세금계산서 정보, 작업 요청사항 등을 적어주세요"
            className="w-full rounded-sm border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand"
          />
        </fieldset>
      </div>

      <aside className="rounded border border-line bg-white p-6 lg:sticky lg:top-24 lg:h-fit">
        <h2 className="text-[16px] font-bold text-ink">주문 내역</h2>

        <ul className="mt-4 space-y-3 border-t border-line pt-4 text-[13px]">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{it.productName}</p>
                <p className="mt-0.5 text-[11px] text-ink-sub">
                  {Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  {it.pageCount ? ` · ${it.pageCount}쪽` : ""} · {it.quantity}개
                </p>
              </div>
              <p className="shrink-0 font-medium text-ink">
                {it.subtotal.toLocaleString()}원
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13px]">
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
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-[14px] font-bold text-ink">결제 금액</span>
          <span className="text-[22px] font-black tracking-tight text-brand">
            {total.toLocaleString()}원
          </span>
        </div>

        {err && (
          <p className="mt-3 rounded-sm border border-brand bg-brand-light px-3 py-2 text-[12px] text-brand">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-sm bg-brand py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "결제 진행 중…" : "결제하기"}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-sub">
          사이다페이로 안전하게 결제됩니다.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold text-ink">
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </span>
      {children}
    </label>
  );
}
