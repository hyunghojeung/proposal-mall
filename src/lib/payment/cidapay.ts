// 사이다페이 연동 어댑터 (공식 API 문서 기준)
// 결제 요청: POST https://api.ciderpay.com/oapi/payment/request
// Header: approvalToken
// returnmode: "JUST" → 결제완료 후 returnurl 로 즉시 리다이렉트 (GET, csturl 포함)
// feedbackurl: 서버→서버 POST 결제 완료 통지
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

    // feedbackurl: 사이다페이 서버 → 우리 서버 결제 완료 통지 (POST)
    // returnurl:   결제완료 후 사용자 브라우저 리다이렉트 (JUST 모드 → GET)
    //              주문번호를 쿼리파라미터로 포함시켜 return 핸들러에서 식별
    const origin = new URL(input.returnUrl).origin;
    const feedbackUrl = `${origin}/api/payment/webhook`;
    const returnUrl = `${origin}/api/payment/return?order=${encodeURIComponent(input.orderSerial)}`;

    const paymentData = {
      memberID,
      price: input.amount,
      goodName: input.productName,
      mobile: input.customerPhone.replace(/-/g, ""),
      customName: input.customerName,
      email: input.customerEmail,
      feedbackurl: feedbackUrl,
      returnurl: returnUrl,
      returnmode: "JUST",          // 결제완료 후 returnurl 즉시 호출 (영수증 URL 포함)
      var1: input.orderSerial,     // feedback 콜백에서 주문 식별용
      var2: "PROPOSAL_MALL",
      smsuse: "Y",
      whereFrom: "PROPOSAL_MALL_WEBSITE",
      sellerMemo: "제안서몰 주문 결제",
      makeQr: false,
    };

    const response = await fetch(`${CIDERPAY_BASE}/oapi/payment/request`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
        "approvalToken": apiKey,   // 공식 문서 헤더명
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`사이다페이 요청 실패 (${response.status}): ${text}`);
    }

    const result = await response.json() as {
      success?: boolean;
      payUrl?: string;
      payUniqueNo?: string;
      errCode?: string;
      message?: string;
    };

    if (result.payUrl) {
      return { redirectUrl: result.payUrl };
    }

    // 실패 응답: errCode + message
    throw new Error(
      result.message
        ? `사이다페이 오류 [${result.errCode ?? "?"}]: ${result.message}`
        : "사이다페이: payUrl 없음"
    );
  },

  // returnmode=JUST → GET 리다이렉트로 returnurl 호출
  // query params: order(우리가 넣은 주문번호), csturl(영수증URL), + 결제 결과 파라미터
  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    // 우리가 returnurl에 직접 넣은 order 파라미터로 주문 식별
    const orderSerial = query.get("order") ?? query.get("var1") ?? "";

    // 사이다페이가 returnurl 호출 시 결제 결과도 함께 전달할 수 있음
    const state = query.get("paymentState") ?? "";
    const success = state === "COMPLETE" || state === "" ; // JUST 모드는 성공 시에만 호출
    const isCancelled = state === "CANCEL";

    return {
      orderSerial,
      status: isCancelled ? "cancelled" : success ? "success" : "failed",
      tid: query.get("orderNo") ?? undefined,
      amount: query.get("price") ? Number(query.get("price")) : undefined,
      errorMessage: query.get("errorMessage") ?? undefined,
    };
  },

  // feedbackurl: 사이다페이 서버 → 우리 서버 POST 통지
  // 공식 Feedback 필드: memberID, feedbackToken, goodName, price, recvPhone,
  //                     paymentState(COMPLETE/CANCEL), payType, orderNo, approvalNo,
  //                     ccname, var1, var2, cardNum, cardQuota, csturl
  verifyWebhook(rawBody: string, _signature: string | null) {
    try {
      let data: Record<string, string>;
      if (rawBody.startsWith("{")) {
        data = JSON.parse(rawBody) as Record<string, string>;
      } else {
        data = Object.fromEntries(new URLSearchParams(rawBody));
      }

      const state = String(data.paymentState ?? "");
      const success = state === "COMPLETE";
      const cancelled = state === "CANCEL";

      return {
        valid: true,
        payload: {
          orderSerial: String(data.var1 ?? ""),
          status: success ? "success" : cancelled ? "cancelled" : "failed",
          tid: data.orderNo ?? undefined,
          amount: data.price ? Number(data.price) : undefined,
          errorMessage: data.errorMessage ?? undefined,
          // feedbackToken은 payload에 없지만 rawBody에서 직접 파싱해서 사용
        } satisfies PaymentReturnPayload,
      };
    } catch {
      return { valid: false };
    }
  },
};
