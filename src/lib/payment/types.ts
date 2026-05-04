// 결제 어댑터 인터페이스. 사이다페이는 별도 어댑터로 구현 (lib/payment/cidapay.ts).
// 개발 환경에선 stub 어댑터가 즉시 성공으로 처리한다.

export interface PaymentInitInput {
  orderSerial: string;     // "Pro-0001"
  amount: number;          // 결제 금액 (원)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;     // 결제창 표시용 (예: "제안서몰 주문 (3건)")
  returnUrl: string;       // 결제 완료 후 사용자 리다이렉트
  notifyUrl: string;       // 서버-서버 웹훅 URL
}

export interface PaymentInitResult {
  // 둘 중 하나
  redirectUrl?: string;            // 사용자를 이 URL로 리다이렉트
  formAction?: {
    url: string;
    method: "POST" | "GET";
    fields: Record<string, string>;
  };
  // stub 모드인 경우
  testCompletedUrl?: string;
}

export interface PaymentReturnPayload {
  orderSerial: string;
  status: "success" | "failed" | "cancelled";
  tid?: string;            // 거래 ID (PG 발급)
  amount?: number;
  errorMessage?: string;
}

export interface PaymentAdapter {
  name: string;
  init(input: PaymentInitInput): Promise<PaymentInitResult>;
  parseReturn(query: URLSearchParams): PaymentReturnPayload;
  verifyWebhook(rawBody: string, signature: string | null): {
    valid: boolean;
    payload?: PaymentReturnPayload;
  };
}
