// 사이다페이 실제 연동 어댑터
// API: POST https://api.ciderpay.com/oapi/payment/request/s2
// 환경변수: CIDERPAY_API_KEY, CIDERPAY_MID (기본값: 1140456136)

import type {
  PaymentAdapter,
  PaymentInitInput,
  PaymentInitResult,
  PaymentReturnPayload,
} from "./types";

const CIDERPAY_BASE = "https://api.ciderpay.com";

function getApiKey(): string {
  const key = process.env.CIDERPAY_API_KEY;
  if (!key) throw new Error("CIDERPAY_API_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

function getMerchantId(): string {
  return process.env.CIDERPAY_MID ?? "1140456136";
}

export const cidapayAdapter: PaymentAdapter = {
  name: "ciderpay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const apiKey = getApiKey();
    const memberID = getMerchantId();

    // feedbackurl: 사이다페이 서버 → 우리 서버 (결제결과 POST)
    // returnurl:   결제 완료 후 사용자 브라우저 리다이렉트
    let feedbackUrl: string;
    try {
      const origin = new URL(input.returnUrl).origin;
      feedbackUrl = `${origin}/api/payment/webhook`;
    } catch {
      feedbackUrl = input.notifyUrl;
    }

    const paymentData = {
      memberID,
      price: input.amount,
      goodName: input.productName,
      mobile: input.customerPhone.replace(/-/g, ""),
      customName: input.customerName,
      email: input.customerEmail,
      feedbackurl: feedbackUrl,
      returnurl: input.returnUrl,
      returnmode: "POST",          // 결제완료 후 POST로 returnUrl 호출
      var1: input.orderSerial,     // 콜백에서 주문 식별용
      var2: "PROPOSAL_MALL",
      smsuse: "Y",
      charSet: "UTF-8",
      makeQr: "false",
      goods: [
        {
          goodName: input.productName,
          goodPrice: input.amount,
          useTax: true,
        },
      ],
    };

    const response = await fetch(`${CIDERPAY_BASE}/oapi/payment/request/s2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "approvalToken": apiKey,
        "Authorization": `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
        "Origin": new URL(input.returnUrl).origin,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`사이다페이 요청 실패 (${response.status}): ${text}`);
    }

    const result = await response.json() as {
      payUrl?: string;
      payUniqueNo?: string;
      success?: boolean;
      message?: string;
      error?: string;
    };

    if (result.payUrl && result.payUniqueNo) {
      return { redirectUrl: result.payUrl };
    }

    throw new Error(result.message ?? result.error ?? "사이다페이: payUrl 없음");
  },

  // 결제 완료 후 사용자 브라우저 리다이렉트 파싱 (GET or POST body)
  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    const state = query.get("paymentState") ?? query.get("status") ?? "";
    const success = state === "COMPLETE" || state === "completed" || state === "success";
    return {
      orderSerial: query.get("var1") ?? query.get("orderSerial") ?? "",
      status: success ? "success" : state === "CANCEL" ? "cancelled" : "failed",
      tid: query.get("orderNo") ?? query.get("tid") ?? undefined,
      amount: query.get("price") ? Number(query.get("price")) : undefined,
      errorMessage: query.get("errorMessage") ?? query.get("message") ?? undefined,
    };
  },

  // 서버→서버 콜백 (feedbackurl) 검증 — 사이다페이는 별도 서명 없이 POST body로 전송
  verifyWebhook(rawBody: string, _signature: string | null) {
    try {
      // form-urlencoded 또는 JSON 둘 다 지원
      let data: Record<string, string>;
      if (rawBody.startsWith("{")) {
        data = JSON.parse(rawBody);
      } else {
        data = Object.fromEntries(new URLSearchParams(rawBody));
      }

      const state = data.paymentState ?? "";
      const success = state === "COMPLETE" || state === "completed";

      return {
        valid: true,
        payload: {
          orderSerial: data.var1 ?? "",
          status: success ? "success" : state === "CANCEL" ? "cancelled" : "failed",
          tid: data.orderNo ?? undefined,
          amount: data.price ? Number(data.price) : undefined,
          errorMessage: data.errorMessage ?? data.message ?? undefined,
        } satisfies PaymentReturnPayload,
      };
    } catch {
      return { valid: false };
    }
  },
};
