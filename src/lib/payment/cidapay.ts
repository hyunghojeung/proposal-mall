// 사이다페이 연동 어댑터 (공식 API 문서 기준)
//
// 결제 흐름:
//   1. GET  /oapi/pmember/makeWebKey  → approvalToken(webKey) 발급
//   2. POST /oapi/payment/request     → payUrl 획득 → 사용자 리다이렉트
//
// 필요 환경변수:
//   CIDERPAY_DEV_ID    - 개발사 아이디
//   CIDERPAY_DEV_TOKEN - 개발사 토큰
//   CIDERPAY_MID       - 가맹점(회원) 아이디 (기본값: 1140456136)

import type {
  PaymentAdapter,
  PaymentInitInput,
  PaymentInitResult,
  PaymentReturnPayload,
} from "./types";

const BASE = "https://api.ciderpay.com";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`사이다페이: 환경변수 ${name} 가 설정되지 않았습니다.`);
  return v;
}

function getMerchantId(): string {
  return process.env.CIDERPAY_MID ?? "1140456136";
}

// makeWebKey API 호출 → approvalToken 발급
async function fetchApprovalToken(): Promise<string> {
  const devID    = requireEnv("CIDERPAY_DEV_ID");
  const devToken = requireEnv("CIDERPAY_DEV_TOKEN");
  const memberID = getMerchantId();

  const url = new URL(`${BASE}/oapi/pmember/makeWebKey`);
  url.searchParams.set("memberID", memberID);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "accept":   "application/json",
      "devID":    devID,
      "devToken": devToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`사이다페이 makeWebKey 실패 (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    success?: boolean;
    webKey?: string;
    approvalToken?: string;
    errCode?: string;
    message?: string;
  };

  const token = json.webKey ?? json.approvalToken;
  if (!token) {
    throw new Error(
      json.message
        ? `사이다페이 makeWebKey 오류 [${json.errCode ?? "?"}]: ${json.message}`
        : "사이다페이: webKey 없음"
    );
  }

  return token;
}

export const cidapayAdapter: PaymentAdapter = {
  name: "ciderpay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const memberID = getMerchantId();

    // 1단계: approvalToken 발급
    const approvalToken = await fetchApprovalToken();

    // returnurl에 주문번호를 파라미터로 포함 → return 핸들러에서 식별
    const origin      = new URL(input.returnUrl).origin;
    const feedbackUrl = `${origin}/api/payment/webhook`;
    const returnUrl   = `${origin}/api/payment/return?order=${encodeURIComponent(input.orderSerial)}`;

    // 2단계: 결제 요청
    const paymentData = {
      memberID,
      price:       input.amount,
      goodName:    input.productName,
      mobile:      input.customerPhone.replace(/-/g, ""),
      customName:  input.customerName,
      email:       input.customerEmail,
      feedbackurl: feedbackUrl,
      returnurl:   returnUrl,
      returnmode:  "JUST",          // 결제완료 후 returnurl 즉시 호출 (GET)
      var1:        input.orderSerial, // feedback 콜백에서 주문 식별
      var2:        "PROPOSAL_MALL",
      smsuse:      "Y",
      whereFrom:   "PROPOSAL_MALL_WEBSITE",
      sellerMemo:  "제안서몰 주문 결제",
      makeQr:      false,
    };

    const res = await fetch(`${BASE}/oapi/payment/request`, {
      method: "POST",
      headers: {
        "accept":         "application/json",
        "Content-Type":   "application/json",
        "approvalToken":  approvalToken,
      },
      body: JSON.stringify(paymentData),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`사이다페이 결제요청 실패 (${res.status}): ${text}`);
    }

    const result = await res.json() as {
      success?:     boolean;
      payUrl?:      string;
      payUniqueNo?: string;
      errCode?:     string;
      message?:     string;
    };

    if (result.payUrl) {
      return { redirectUrl: result.payUrl };
    }

    throw new Error(
      result.message
        ? `사이다페이 오류 [${result.errCode ?? "?"}]: ${result.message}`
        : "사이다페이: payUrl 없음"
    );
  },

  // returnmode=JUST → 결제완료 후 GET으로 returnurl 호출
  // returnurl 에 ?order=주문번호 를 포함시켰으므로 쿼리파라미터로 식별
  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    const orderSerial = query.get("order") ?? query.get("var1") ?? "";
    const state       = query.get("paymentState") ?? "";
    const cancelled   = state === "CANCEL";

    return {
      orderSerial,
      status:       cancelled ? "cancelled" : "success", // JUST 모드는 성공 시에만 호출
      tid:          query.get("orderNo") ?? undefined,
      amount:       query.get("price") ? Number(query.get("price")) : undefined,
      errorMessage: query.get("errorMessage") ?? undefined,
    };
  },

  // feedbackurl: 사이다페이 서버 → 우리 서버 POST 통지
  // 공식 Feedback 필드: var1, paymentState, orderNo, feedbackToken, price, approvalNo, ccname 등
  verifyWebhook(rawBody: string, _signature: string | null) {
    try {
      let data: Record<string, string>;
      if (rawBody.startsWith("{")) {
        data = JSON.parse(rawBody) as Record<string, string>;
      } else {
        data = Object.fromEntries(new URLSearchParams(rawBody));
      }

      const state     = String(data.paymentState ?? "");
      const success   = state === "COMPLETE";
      const cancelled = state === "CANCEL";

      return {
        valid: true,
        payload: {
          orderSerial:  String(data.var1 ?? ""),
          status:       success ? "success" : cancelled ? "cancelled" : "failed",
          tid:          data.orderNo    ?? undefined,
          amount:       data.price ? Number(data.price) : undefined,
          errorMessage: data.errorMessage ?? undefined,
        } satisfies PaymentReturnPayload,
      };
    } catch {
      return { valid: false };
    }
  },
};
