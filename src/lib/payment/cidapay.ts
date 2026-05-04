// 사이다페이 어댑터 — 실제 PG 연동.
// 사이다페이 가맹점 매뉴얼에 따라 실제 API call / 서명 검증으로 채워야 함.
// 현재는 placeholder: CIDAPAY_API_BASE가 셋업되면 사용하지만, 호출은 throw 하여
// 환경이 미완성임을 명시적으로 알린다.

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentAdapter,
  PaymentInitInput,
  PaymentInitResult,
  PaymentReturnPayload,
} from "./types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `사이다페이 환경변수 ${name} 가 설정되지 않았습니다. .env에 채워주세요.`,
    );
  }
  return v;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const cidapayAdapter: PaymentAdapter = {
  name: "cidapay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const apiBase = requireEnv("CIDAPAY_API_BASE");
    const mid = requireEnv("CIDAPAY_MID");
    const apiKey = requireEnv("CIDAPAY_API_KEY");

    // TODO: 사이다페이 매뉴얼에 맞게 본 호출로 교체.
    // 일반적 패턴: POST {apiBase}/payments/ready 로 주문/금액/리다이렉트 URL 보내고
    // 응답으로 {redirectUrl, tid} 받음.
    const timestamp = String(Date.now());
    const signaturePayload = [mid, input.orderSerial, input.amount, timestamp].join("|");
    const signature = sign(signaturePayload, apiKey);

    return {
      formAction: {
        url: `${apiBase}/payments/ready`,
        method: "POST",
        fields: {
          mid,
          orderSerial: input.orderSerial,
          amount: String(input.amount),
          productName: input.productName,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          returnUrl: input.returnUrl,
          notifyUrl: input.notifyUrl,
          timestamp,
          signature,
        },
      },
    };
  },

  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    const status = query.get("status");
    return {
      orderSerial: query.get("orderSerial") ?? query.get("orderId") ?? "",
      status:
        status === "success" || status === "PAID"
          ? "success"
          : status === "cancelled" || status === "CANCELLED"
            ? "cancelled"
            : "failed",
      tid: query.get("tid") ?? undefined,
      amount: query.get("amount") ? Number(query.get("amount")) : undefined,
      errorMessage: query.get("errorMessage") ?? undefined,
    };
  },

  verifyWebhook(rawBody: string, signature: string | null) {
    if (!signature) return { valid: false };
    let apiKey: string;
    try {
      apiKey = requireEnv("CIDAPAY_API_KEY");
    } catch {
      return { valid: false };
    }
    const expected = sign(rawBody, apiKey);
    if (!safeEqual(expected, signature)) return { valid: false };

    try {
      const data = JSON.parse(rawBody);
      return {
        valid: true,
        payload: {
          orderSerial: String(data.orderSerial ?? ""),
          status:
            data.status === "PAID" || data.status === "success" ? "success" : "failed",
          tid: data.tid ?? undefined,
          amount: typeof data.amount === "number" ? data.amount : undefined,
        },
      };
    } catch {
      return { valid: false };
    }
  },
};
