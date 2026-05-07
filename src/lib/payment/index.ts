// 환경에 따라 적절한 결제 어댑터를 반환.
// CIDERPAY_API_KEY 가 설정되어 있으면 실제 사이다페이, 아니면 stub.

import { cidapayAdapter } from "./cidapay";
import { stubAdapter } from "./stub";
import type { PaymentAdapter } from "./types";

export function getPaymentAdapter(): PaymentAdapter {
  if (process.env.CIDERPAY_API_KEY) {
    return cidapayAdapter;
  }
  return stubAdapter;
}

export type { PaymentAdapter, PaymentInitInput, PaymentInitResult, PaymentReturnPayload } from "./types";
