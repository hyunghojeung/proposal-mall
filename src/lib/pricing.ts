// 가격 계산 헬퍼 — 수량 구간 매핑 + 단가표 lookup
// 수량 구간: 1 / 2~4 / 5~9 / 10+

export type QtyTier = "1" | "2-4" | "5-9" | "10+";

export function quantityTier(quantity: number): QtyTier {
  if (quantity <= 1) return "1";
  if (quantity <= 4) return "2-4";
  if (quantity <= 9) return "5-9";
  return "10+";
}

export const SHIPPING_FEE = 2500;
export const FREE_SHIPPING_THRESHOLD = 30000;

export function shippingFee(subtotal: number, method: "COURIER" | "PICKUP") {
  if (method === "PICKUP") return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

// 주문 일련번호: Pro-0001 형식
export function formatOrderSerial(seq: number): string {
  return `Pro-${String(seq).padStart(4, "0")}`;
}
