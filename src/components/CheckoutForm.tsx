"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CartItem,
  cartSubtotal,
  clearCart,
  readCart,
  subscribeCart,
} from "@/lib/cart";
import { shippingFee, type DeliveryMethod, DELIVERY_LABELS } from "@/lib/pricing";

interface CheckoutResp {
  order?: { serial: string; totalAmount: number; createdAt?: string; productNames?: string[] };
  payment?: {
    adapter: string;
    redirectUrl?: string;
    formAction?: { url: string; method: "POST" | "GET"; fields: Record<string, string> };
    testCompletedUrl?: string;
  };
  error?: string;
}


type PaymentMethod = "CARD" | "TRANSFER";

// 관리자 테스트용 더미 데이터
const TEST_DATA = {
  customerName: "테스트주문자",
  customerPhone: "010-1234-5678",
  customerEmail: "test@blackcopy.co.kr",
  company: "블랙카피",
  recipientName: "테스트수령인",
  recipientPhone: "010-1234-5678",
  address: "[06164] 서울 강남구 테헤란로 131 (한국타이어빌딩)",
  addressDetail: "10층 블랙카피",
  shippingMemo: "테스트 배송 메모",
  memo: "테스트 주문입니다. 실제 처리하지 마세요.",
} as const;

const needsAddress = (m: DeliveryMethod) =>
  m === "COURIER_PREPAID" || m === "COURIER_COLLECT" || m === "QUICK_COLLECT";

export function CheckoutForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const failReason = searchParams.get("fail");

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 주문자 정보
  const [customerName, setCustomerName] = useState(isAdmin ? TEST_DATA.customerName : "");
  const [customerPhone, setCustomerPhone] = useState(isAdmin ? TEST_DATA.customerPhone : "");
  const [customerEmail, setCustomerEmail] = useState(isAdmin ? TEST_DATA.customerEmail : "");
  const [company, setCompany] = useState(isAdmin ? TEST_DATA.company : "");

  // 배송 정보
  const [sameAsOrderer, setSameAsOrderer] = useState(false);
  const [recipientName, setRecipientName] = useState(isAdmin ? TEST_DATA.recipientName : "");
  const [recipientPhone, setRecipientPhone] = useState(isAdmin ? TEST_DATA.recipientPhone : "");
  const [address, setAddress] = useState(isAdmin ? TEST_DATA.address : "");
  const [addressDetail, setAddressDetail] = useState(isAdmin ? TEST_DATA.addressDetail : "");
  const [shippingMemo, setShippingMemo] = useState(isAdmin ? TEST_DATA.shippingMemo : "");

  // 배송방법 / 결제방법
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("COURIER_PREPAID");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TRANSFER");

  // 주문 요청사항
  const [memo, setMemo] = useState(isAdmin ? TEST_DATA.memo : "");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
    // 장바구니에서 선택한 배송방법 읽기
    const saved = localStorage.getItem("cart_delivery") as DeliveryMethod | null;
    if (saved) setDeliveryMethod(saved);
    return subscribeCart(() => setItems(readCart()));
  }, []);

  // 주문자 정보와 동일 체크 시 복사
  useEffect(() => {
    if (sameAsOrderer) {
      setRecipientName(customerName);
      setRecipientPhone(customerPhone);
    }
  }, [sameAsOrderer, customerName, customerPhone]);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const fee = shippingFee(subtotal, deliveryMethod);
  const total = subtotal + fee;

  // 카카오 우편번호 서비스 (다음 주소 검색)
  function handleAddressSearch() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daum = (window as any).daum;
    if (!daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    new daum.Postcode({
      oncomplete(data: {
        userSelectedType: string;
        roadAddress: string;
        jibunAddress: string;
        buildingName: string;
        apartment: string;
        zonecode: string;
      }) {
        const base =
          data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        const building = data.buildingName ? ` (${data.buildingName})` : "";
        setAddress(`[${data.zonecode}] ${base}${building}`);
        setAddressDetail("");
        setTimeout(() => {
          document.getElementById("address-detail")?.focus();
        }, 100);
      },
    }).open();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setErr("장바구니가 비어 있습니다."); return; }
    setErr(null);

    // ── 팝업을 클릭 이벤트 컨텍스트에서 미리 열기 ──────────────────────────
    // Chrome은 await 이후의 window.open()을 차단하므로, 버튼 클릭 직후(동기)에
    // 빈 팝업을 열고 API 응답 후 결제 URL로 navigate 한다.
    let prePopup: Window | null = null;
    if (paymentMethod === "CARD") {
      prePopup = window.open(
        "",
        "ciderpay_payment",
        "width=430,height=720,scrollbars=no,resizable=yes,toolbar=no,menubar=no,location=no,status=no"
      );
      if (prePopup) {
        prePopup.document.write(
          `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;
           height:100vh;font-family:sans-serif;background:#f5f5f5;">
           <p style="color:#888;font-size:15px;">결제창을 준비하고 있습니다…</p></body></html>`
        );
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    setSubmitting(true);

    const shippingAddress = needsAddress(deliveryMethod)
      ? [address, addressDetail].filter(Boolean).join(" ")
      : undefined;

    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          company: company || undefined,
          paymentMethod,
          deliveryMethod,
          shippingAddress,
          memo: [
            recipientName !== customerName ? `받는분: ${recipientName} ${recipientPhone}` : "",
            shippingMemo ? `배송 메모: ${shippingMemo}` : "",
            memo || "",
          ].filter(Boolean).join("\n") || undefined,
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
        prePopup?.close();
        setErr(data.error ?? "결제 요청 실패"); setSubmitting(false); return;
      }
      const payment = data.payment;
      const orderSerial = data.order?.serial ?? "";
      if (!payment) {
        prePopup?.close();
        setErr("결제 정보가 없습니다"); setSubmitting(false); return;
      }

      // 무통장 입금 — 전용 완료 페이지로 이동 (헤더/푸터 없음)
      if (payment.adapter === "transfer") {
        clearCart();
        const orderTotal    = data.order?.totalAmount ?? total;
        const productNames  = (data.order?.productNames ?? items.map((it) => it.productName)).join(", ");
        const createdAt     = data.order?.createdAt ?? new Date().toISOString();
        const qs = new URLSearchParams({
          total:     String(orderTotal),
          products:  productNames,
          createdAt,
        });
        window.location.href = `/checkout/complete?${qs.toString()}`;
        return;
      }

      // stub 모드 — 팝업 닫고 바로 이동
      if (payment.testCompletedUrl) {
        prePopup?.close();
        window.location.href = payment.testCompletedUrl;
        return;
      }

      // 사이다페이 — 미리 열어둔 팝업을 결제 URL로 이동
      const payUrl = payment.redirectUrl;
      if (payUrl) {
        if (prePopup && !prePopup.closed) {
          // 미리 열린 팝업을 결제 URL로 이동
          prePopup.location.href = payUrl;

          // ── 서버 폴링 ─────────────────────────────────────────────────────
          // 사이다페이는 결제 완료 후 feedbackurl(webhook)로 서버에 통지한다.
          // webhook이 도착해 주문이 PAID가 되면 폴링이 감지해 주문 상세로 이동.
          // 팝업이 닫혀도 webhook이 늦게 올 수 있으므로 최대 60초까지 대기.
          let polling = true;
          let pollCount = 0;
          const MAX_POLLS = 30; // 2s × 30 = 60초 최대 대기

          const pollTimer = setInterval(async () => {
            if (!polling) return;
            pollCount++;

            try {
              const popupClosed = prePopup!.closed;

              const statusRes = await fetch(`/api/orders/${orderSerial}/status`, {
                credentials: "include",
              });
              if (statusRes.ok) {
                const { status } = (await statusRes.json()) as { status: string };
                const isPaid = status === "PAID" || status === "IN_PRODUCTION" || status === "SHIPPING" || status === "DELIVERED";
                if (isPaid) {
                  clearInterval(pollTimer);
                  polling = false;
                  prePopup?.close();
                  window.location.href = `/orders/${orderSerial}?paid=1`;
                  return;
                }
              }

              // 팝업이 닫혔으면 주문 상세 페이지로 이동 (webhook이 나중에 올 수 있음)
              // 주문 상세 페이지에서 상태를 보여주고, 필요 시 새로고침 유도
              if (popupClosed && polling) {
                polling = false; // 중복 진입 방지
                clearInterval(pollTimer);
                // 결제했을 가능성이 있으므로 주문 상세로 이동 (checking=1 파라미터로 안내 표시)
                window.location.href = `/orders/${orderSerial}?checking=1`;
                return;
              }

              // 최대 대기 시간 초과 → 주문 상세로 이동
              if (pollCount >= MAX_POLLS) {
                polling = false;
                clearInterval(pollTimer);
                window.location.href = `/orders/${orderSerial}?checking=1`;
              }
            } catch { /* 네트워크 오류 무시 */ }
          }, 2000);

        } else {
          // 팝업이 차단된 경우 → 전체 페이지 이동으로 fallback
          window.location.href = payUrl;
        }
        return;
      }

      if (payment.formAction) {
        const form = document.createElement("form");
        form.action = payment.formAction.url;
        form.method = payment.formAction.method;
        for (const [k, v] of Object.entries(payment.formAction.fields)) {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = k; input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form); form.submit(); return;
      }
      setErr("결제 응답을 처리할 수 없습니다"); setSubmitting(false);
    } catch { setErr("네트워크 오류"); setSubmitting(false); }
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-[16px] text-ink-sub">장바구니가 비어 결제할 수 없습니다.</p>
        <button type="button" onClick={() => router.push("/products")}
          className="rounded-sm bg-brand px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark">
          상품 둘러보기
        </button>
      </div>
    );
  }

  return (
    <>
    <h1 className="mb-8 border-b border-line pb-5 text-[28px] font-black tracking-tight text-ink">
      결제
      {isAdmin && (
        <span className="ml-3 align-middle rounded-sm bg-brand px-2 py-0.5 text-[12px] font-bold text-white">
          관리자 테스트 모드
        </span>
      )}
    </h1>
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* ── 왼쪽: 입력 섹션 ── */}
      <div className="space-y-5">
        {failReason && (
          <div className="rounded border border-brand bg-brand-light px-4 py-3 text-[14px] text-brand">
            결제가 완료되지 않았습니다 ({failReason}). 다시 시도해 주세요.
          </div>
        )}

        {/* ① 주문자 정보 */}
        <Card icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} title="주문자 정보">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="고객명" required>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                required maxLength={100} placeholder="홍길동"
                className={input} />
            </Field>
            <Field label="연락처" required>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                required maxLength={40} placeholder="010-0000-0000"
                className={input} />
            </Field>
            <Field label="이메일" required className="sm:col-span-2">
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                required placeholder="example@email.com"
                className={input} />
            </Field>
            <Field label="회사명 (선택)" className="sm:col-span-2">
              <input value={company} onChange={(e) => setCompany(e.target.value)}
                maxLength={100} placeholder="회사명"
                className={input} />
            </Field>
          </div>
        </Card>

        {/* ② 배송 정보 */}
        <Card
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
          title="배송 정보"
          extra={
            <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-ink-sub">
              <input type="checkbox" checked={sameAsOrderer}
                onChange={(e) => setSameAsOrderer(e.target.checked)}
                className="accent-[#E8481A]" />
              주문자 정보와 동일
            </label>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="받는분 성함" required>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                required maxLength={100} placeholder="홍길동"
                className={input} />
            </Field>
            <Field label="받는분 연락처" required>
              <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)}
                required maxLength={40} placeholder="010-0000-0000"
                className={input} />
            </Field>
          </div>
          {needsAddress(deliveryMethod) && (
            <div className="mt-3 space-y-2">
              <Field label="주소" required>
                <div className="flex gap-2">
                  <input value={address} onChange={(e) => setAddress(e.target.value)}
                    required placeholder="주소 검색 버튼을 클릭하세요"
                    className={`${input} flex-1`} readOnly onClick={handleAddressSearch} />
                  <button type="button" onClick={handleAddressSearch}
                    className="flex shrink-0 items-center gap-1 rounded-sm border border-line px-3 py-2 text-[14px] text-ink-sub hover:border-brand hover:text-brand">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    주소 검색
                  </button>
                </div>
              </Field>
              <Field label="상세주소">
                <input id="address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
                  maxLength={200} placeholder="동, 호수 등 상세주소를 입력하세요"
                  className={input} />
              </Field>
            </div>
          )}
          <div className="mt-3">
            <Field label="배송 메모 (선택)">
              <textarea value={shippingMemo} onChange={(e) => setShippingMemo(e.target.value)}
                rows={2} maxLength={500} placeholder="배송 시 요청사항 (선택사항)"
                className={`${input} resize-none`} />
            </Field>
          </div>
        </Card>

        {/* ③ 결제 방법 */}
        <Card icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>} title="결제 방법">
          <div className="space-y-2">
            {([
              { value: "CARD",     label: "카드 결제" },
              { value: "TRANSFER", label: "무통장 입금" },
            ] as { value: PaymentMethod; label: string }[]).map(({ value, label }) => (
              <label key={value}
                className={`flex cursor-pointer items-center gap-3 rounded border px-5 py-3.5 text-[16px] transition-colors ${
                  paymentMethod === value ? "border-brand bg-brand-light" : "border-line hover:border-ink"
                }`}>
                <input type="radio" name="payment" value={value}
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value)}
                  className="accent-[#E8481A]" />
                <span className={paymentMethod === value ? "font-bold text-brand" : "text-ink"}>{label}</span>
              </label>
            ))}
          </div>

          {/* 무통장 입금 계좌 정보 — 항상 표시 */}
          <div className="mt-4 rounded bg-blue-50 border border-blue-100 px-5 py-4 text-[14px]">
            <p className="mb-1 text-ink-sub">계좌 정보</p>
            <p className="font-bold text-[17px] text-ink">우리은행 208-08-426260</p>
            <p className="mt-1 text-ink-sub">예금주: 정형호</p>
          </div>
        </Card>

        {/* ⑤ 주문 요청 사항 */}
        <Card icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>} title="주문 요청 사항">
          <div className="mb-3 rounded-sm bg-bg px-4 py-3 text-[13px] text-ink-sub space-y-1">
            <p><span className="font-bold text-ink">※세금계산서 요청</span></p>
            <p>세금계산서 정보를 여기에 직접 입력하시거나 사업자등록증을 이메일로 첨부해서 보내주세요<br/>
              (<a href="mailto:blackcopy2@naver.com" className="text-brand underline-offset-2 hover:underline">blackcopy2@naver.com</a>)
            </p>
            <p className="mt-2"><span className="font-bold text-ink">※작업시 요청사항</span></p>
            <p>원단종류/금박색상/구멍뚫기 등 요청사항이 있으면 아래 입력란에 입력해주세요.</p>
          </div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
            rows={4} maxLength={2000}
            placeholder="세금계산서 정보, 작업 요청사항 등을 입력해 주세요"
            className={`${input} resize-none`} />
        </Card>
      </div>

      {/* ── 오른쪽: 주문 요약 ── */}
      <aside className="rounded border border-line bg-white p-7 lg:sticky lg:top-24 lg:h-fit">
        <h2 className="text-[20px] font-bold text-ink">주문 내역</h2>

        <ul className="mt-5 space-y-4 border-t border-line pt-5 text-[15px]">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{it.productName}</p>
                <p className="mt-1 text-[13px] text-ink-sub">
                  {Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  {it.pageCount ? ` · ${it.pageCount}쪽` : ""} · {it.quantity}개
                </p>
              </div>
              <p className="shrink-0 font-medium text-ink">{it.subtotal.toLocaleString()}원</p>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2 border-t border-line pt-5 text-[15px]">
          <div className="flex justify-between">
            <span className="text-ink-sub">상품 합계</span>
            <span className="font-medium text-ink">{subtotal.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-sub">배송방법</span>
            <span className="font-medium text-ink">{DELIVERY_LABELS[deliveryMethod]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-sub">배송비</span>
            <span className="font-medium text-ink">
              {fee === 0
                ? (deliveryMethod === "PICKUP" ? "무료" : "착불 별도")
                : `${fee.toLocaleString()}원`}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-[17px] font-bold text-ink">결제 금액</span>
          <span className="text-[28px] font-black tracking-tight text-brand">
            {total.toLocaleString()}원
          </span>
        </div>

        {err && (
          <p className="mt-3 rounded border border-brand bg-brand-light px-4 py-3 text-[14px] text-brand">{err}</p>
        )}

        <button type="submit" disabled={submitting}
          className="mt-5 w-full rounded bg-brand py-4 text-[17px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "처리 중…" : "결제하기"}
        </button>
        <p className="mt-2 text-center text-[13px] text-ink-sub">
          다음 단계에서 주문 정보를 확인하고 결제까지 완료합니다.
        </p>
      </aside>
    </form>
    </>
  );
}

// ── 공통 스타일 ──
const input =
  "w-full rounded border border-line px-4 py-3 text-[16px] outline-none focus:border-brand";

// ── 섹션 카드 ──
function Card({
  icon,
  title,
  extra,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink">
          {icon}
          {title}
        </h2>
        {extra}
      </div>
      {children}
    </div>
  );
}

// ── 필드 레이블 ──
function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-2 block text-[15px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </span>
      {children}
    </label>
  );
}
