// 사이다페이 연동 어댑터 (공식 API 문서 기준)
//
// 결제 흐름:
//   1. GET  /oapi/pmember/makeWebKey                   → approvalToken 동적 발급
//   2. POST /oapi/payment/request                      → payUrl 획득 → 사용자 팝업
//   3. 결제완료 → feedbackurl(POST) 수신 → 주문 PAID 처리
//   4. 취소 시 → POST /oapi/payment/cancel (feedbackToken + orderNo)
//
// 필요 환경변수:
//   CIDERPAY_DEV_ID    개발사 아이디
//   CIDERPAY_DEV_TOKEN 개발사 토큰
//   CIDERPAY_MID       가맹점 회원 아이디 (기본값: 1140456136)

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

function getMid(): string {
  return process.env.CIDERPAY_MID ?? "1140456136";
}

function devHeaders() {
  return {
    "accept":     "application/json",
    "devID":      requireEnv("CIDERPAY_DEV_ID"),
    "devToken":   requireEnv("CIDERPAY_DEV_TOKEN"),
  };
}

// GET /oapi/pmember/makeWebKey
// devID + devToken 헤더, memberID 쿼리파라미터로 approvalToken 동적 발급
// 정적 CIDERPAY_API_KEY 없이 매 결제마다 토큰을 새로 발급받는 방식
async function fetchMakeWebKey(): Promise<string> {
  const url = new URL(`${BASE}/oapi/pmember/makeWebKey`);
  url.searchParams.set("memberID", getMid());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: devHeaders(), // accept + devID + devToken
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`사이다페이 makeWebKey 실패 (${res.status}): ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as Record<string, any>;
  console.log("[ciderpay] makeWebKey 응답:", JSON.stringify(json));

  // 공식 문서 기준 응답: { success, message, var1 }
  // var1 = 웹 로그인 가능한 토큰값 (= approvalToken)
  const approvalToken = json?.var1 ?? null;

  if (!approvalToken) {
    throw new Error(
      json?.message
        ? `사이다페이 makeWebKey 오류: ${json.message}`
        : `사이다페이: var1(토큰) 없음. 응답: ${JSON.stringify(json)}`
    );
  }

  return String(approvalToken);
}

export const cidapayAdapter: PaymentAdapter = {
  name: "ciderpay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const mid = getMid();

    // approvalToken 획득
    // - CIDERPAY_API_KEY 가 설정된 경우 → 정적 토큰 사용 (fallback)
    // - CIDERPAY_DEV_ID + CIDERPAY_DEV_TOKEN → makeWebKey API로 동적 발급 (권장)
    let approvalToken: string;
    const staticKey = process.env.CIDERPAY_API_KEY;
    if (staticKey) {
      approvalToken = staticKey;
    } else {
      // makeWebKey: devID + devToken으로 approvalToken 동적 발급
      approvalToken = await fetchMakeWebKey();
    }

    // returnurl에 주문번호 포함 → return 핸들러에서 주문 식별
    const origin      = new URL(input.returnUrl).origin;
    const feedbackUrl = `${origin}/api/payment/webhook`;
    const returnUrl   = `${origin}/api/payment/return?order=${encodeURIComponent(input.orderSerial)}`;

    // 2단계: 결제 요청
    const paymentData = {
      memberID:    mid,
      price:       input.amount,
      goodName:    input.productName,
      mobile:      input.customerPhone.replace(/-/g, ""),
      customName:  input.customerName,
      email:       input.customerEmail,
      feedbackurl: feedbackUrl,
      returnurl:   returnUrl,
      returnmode:  "JUST",           // 결제완료 후 returnurl 즉시 호출 (GET)
      var1:        input.orderSerial, // feedback 콜백에서 주문 식별
      var2:        "PROPOSAL_MALL",
      smsuse:      "Y",
      whereFrom:   "PROPOSAL_MALL_WEBSITE",
      sellerMemo:  "제안서몰 주문 결제",
      makeQr:      "false",
      charSet:     "UTF-8",
      goods: [
        {
          goodName:  input.productName,
          goodPrice: input.amount,
          useTax:    true,
        },
      ],
    };

    const res = await fetch(`${BASE}/oapi/payment/request/s2`, {
      method: "POST",
      headers: {
        "accept":           "application/json",
        "Content-Type":     "application/json",
        "approvalToken":    approvalToken,
        "Authorization":    `Bearer ${approvalToken}`,
        "X-API-Key":        approvalToken,
        "X-Requested-With": "XMLHttpRequest",
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

  // returnmode=JUST → 결제완료 후 GET으로 returnurl 즉시 호출
  // 우리가 returnurl에 ?order=주문번호 를 넣었으므로 쿼리파라미터로 식별
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
  // 공식 Feedback 필드:
  //   memberID, feedbackToken, goodName, price, recvPhone
  //   paymentState (COMPLETE | CANCEL)
  //   payType (1:카드 2:핸드폰 3:카카오페이)
  //   orderNo (주문번호), approvalNo (승인번호), ccname (카드사명)
  //   var1 (우리가 넣은 orderSerial), var2, cardNum, cardQuota, csturl
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          tid:          data.orderNo     ?? undefined,
          amount:       data.price ? Number(data.price) : undefined,
          errorMessage: data.errorMessage ?? undefined,
        } satisfies PaymentReturnPayload,
      };
    } catch {
      return { valid: false };
    }
  },
};

// ── 결제 취소 유틸 (관리자 패널에서 호출) ──────────────────────────────────
// POST /oapi/payment/cancel
// 필드: memberID, orderNo (사이다페이 주문번호 = paymentTid), token (feedbackToken)
export async function cancelPayment(params: {
  orderNo: string;       // 사이다페이 orderNo (paymentTid)
  token: string;         // feedbackToken (feedback 콜백에서 수신한 값)
  cancelMessage?: string;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const mid = getMid();

  const res = await fetch(`${BASE}/oapi/payment/cancel`, {
    method: "POST",
    headers: {
      "accept":        "application/json",
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      memberID:      mid,
      orderNo:       params.orderNo,
      token:         params.token,
      rangeType:     "ALL",
      cancelMessage: params.cancelMessage ?? "주문 취소",
    }),
  });

  const json = await res.json() as { success?: boolean; errorMessage?: string; message?: string };
  return {
    success:      json.success === true,
    errorMessage: json.errorMessage ?? json.message,
  };
}
