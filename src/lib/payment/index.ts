// 환경에 따라 적절한 결제 어댑터를 반환.
// CIDAPAY_API_BASE 가 설정되어 있으면 cidapay, 아니면 stub.

import { cidapayAdapter } from "./cidapay";
import { stubAdapter } from "./stub";
import type { PaymentAdapter } from "./types";

export function getPaymentAdapter(): PaymentAdapter {
  if (process.env.CIDAPAY_API_BASE) {
    return cidapayAdapter;
  }
  return stubAdapter;
}

export type { PaymentAdapter, PaymentInitInput, PaymentInitResult, PaymentReturnPayload } from "./types";
