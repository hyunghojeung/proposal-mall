// 환경에 따라 적절한 결제 어댑터를 반환.
// CIDERPAY_DEV_ID + CIDERPAY_DEV_TOKEN 이 모두 설정되면 실제 사이다페이 연동.
// 그 외에는 stub (테스트 모드).

import { cidapayAdapter } from "./cidapay";
import { stubAdapter } from "./stub";
import type { PaymentAdapter } from "./types";

export function getPaymentAdapter(): PaymentAdapter {
  // CIDERPAY_API_KEY (정적 토큰) 또는 CIDERPAY_DEV_ID + CIDERPAY_DEV_TOKEN (동적 조회) 중 하나 설정 시 실제 결제
  if (
    process.env.CIDERPAY_API_KEY ||
    (process.env.CIDERPAY_DEV_ID && process.env.CIDERPAY_DEV_TOKEN)
  ) {
    return cidapayAdapter;
  }
  return stubAdapter;
}

export type { PaymentAdapter, PaymentInitInput, PaymentInitResult, PaymentReturnPayload } from "./types";
