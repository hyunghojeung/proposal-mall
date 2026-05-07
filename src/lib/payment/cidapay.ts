// 사이다페이 연동 어댑터 (공식 API 문서 기준)
//
// 결제 흐름:
//   0. POST /oapi/pv/payment/setPayTokenYn/{memberID}  → 토큰 결제 활성화
//   1. GET  /oapi/pmember/childToken                   → approvalToken + feedbackToken 조회
//   2. POST /oapi/payment/request                      → payUrl 획득 → 사용자 리다이렉트
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

// POST /oapi/pv/payment/setPayTokenYn/{memberID}
// 토큰 결제 활성화 — childToken 호출 전 반드시 선행
// 헤더: devID, devToken
// 바디: multipart form-data  payTokenYn=Y
async function setPayTokenYn(yn: "Y" | "N" = "Y"): Promise<void> {
  const mid = getMid();

  const form = new FormData();
  form.append("payTokenYn", yn);

  const res = await fetch(`${BASE}/oapi/pv/payment/setPayTokenYn/${mid}`, {
    method: "POST",
    headers: devHeaders(),   // accept + devID + devToken (Content-Type은 FormData가 자동 설정)
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`사이다페이 setPayTokenYn 실패 (${res.status}): ${text}`);
  }

  const json = await res.json() as { success?: boolean; errorMessage?: string };
  if (json.success === false) {
    throw new Error(`사이다페이 setPayTokenYn 오류: ${json.errorMessage ?? "알 수 없는 오류"}`);
  }
}

// GET /oapi/pmember/childToken
// → data.approvalToken (결제 헤더용)
// → data.feedbackToken (취소 토큰 — 미리 저장해두면 유용)
async function fetchChildToken(): Promise<{ approvalToken: string; feedbackToken: string }> {
  const url = new URL(`${BASE}/oapi/pmember/childToken`);
  url.searchParams.set("memberID", getMid());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: devHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`사이다페이 childToken 실패 (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    success?: boolean;
    errorMessage?: string;
    data?: { approvalToken?: string; feedbackToken?: string };
  };

  const approvalToken = json.data?.approvalToken;
  const feedbackToken = json.data?.feedbackToken ?? "";

  if (!approvalToken) {
    throw new Error(
      json.errorMessage
        ? `사이다페이 childToken 오류: ${json.errorMessage}`
        : "사이다페이: approvalToken 없음"
    );
  }

  return { approvalToken, feedbackToken };
}

export const cidapayAdapter: PaymentAdapter = {
  name: "ciderpay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const mid = getMid();

    // 0단계: 토큰 결제 활성화 (childToken 사용 전 필수)
    await setPayTokenYn("Y");

    // 1단계: approvalToken 조회
    const { approvalToken } = await fetchChildToken();

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
      makeQr:      false,
    };

    const res = await fetch(`${BASE}/oapi/payment/request`, {
      method: "POST",
      headers: {
        "accept":        "application/json",
        "Content-Type":  "application/json",
        "approvalToken": approvalToken,
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
