// Stub 결제 어댑터. CIDAPAY_API_BASE가 설정되지 않은 환경(로컬 dev / 사전 데모)에서
// 실제 PG 호출 없이 결제 흐름 전체를 검증할 수 있게 해준다.
// /api/payment/return?orderSerial=...&status=success&amount=... 로 직접 리다이렉트.

import type {
  PaymentAdapter,
  PaymentInitInput,
  PaymentInitResult,
  PaymentReturnPayload,
} from "./types";

export const stubAdapter: PaymentAdapter = {
  name: "stub",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const params = new URLSearchParams({
      orderSerial: input.orderSerial,
      status: "success",
      amount: String(input.amount),
      tid: `STUB-${Date.now()}`,
      stub: "1",
    });
    return {
      testCompletedUrl: `${input.returnUrl}?${params.toString()}`,
    };
  },

  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    const status = query.get("status");
    return {
      orderSerial: query.get("orderSerial") ?? "",
      status:
        status === "success" ? "success" : status === "cancelled" ? "cancelled" : "failed",
      tid: query.get("tid") ?? undefined,
      amount: query.get("amount") ? Number(query.get("amount")) : undefined,
    };
  },

  verifyWebhook(rawBody) {
    try {
      const data = JSON.parse(rawBody);
      return {
        valid: true,
        payload: {
          orderSerial: String(data.orderSerial ?? ""),
          status: data.status === "success" ? "success" : "failed",
          tid: data.tid ?? undefined,
          amount: data.amount ?? undefined,
        },
      };
    } catch {
      return { valid: false };
    }
  },
};
