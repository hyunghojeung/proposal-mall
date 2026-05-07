// 가격 계산 헬퍼 — 수량 구간 매핑 + 단가표 lookup
// 수량 구간: 1 / 2~4 / 5~9 / 10+

export type QtyTier = "1" | "2-4" | "5-9" | "10+";

export function quantityTier(quantity: number): QtyTier {
  if (quantity <= 1) return "1";
  if (quantity <= 4) return "2-4";
  if (quantity <= 9) return "5-9";
  return "10+";
}

export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 30000;

export type DeliveryMethod =
  | "COURIER_PREPAID"   // 택배선불
  | "COURIER_COLLECT"   // 택배착불
  | "QUICK_PREPAID"     // 퀵선불
  | "QUICK_COLLECT"     // 퀵착불
  | "PICKUP";           // 직접 방문 수령

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  COURIER_PREPAID: "택배선불",
  COURIER_COLLECT: "택배착불",
  QUICK_PREPAID: "퀵선불",
  QUICK_COLLECT: "퀵착불",
  PICKUP: "직접 방문 수령",
};

export function shippingFee(subtotal: number, method: DeliveryMethod): number {
  // 착불·퀵·방문수령 → 배송비 별도(0으로 표시)
  if (method === "PICKUP" || method === "COURIER_COLLECT" || method === "QUICK_COLLECT" || method === "QUICK_PREPAID") return 0;
  // 택배선불: 3,000원 (30,000원 이상 무료)
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEE;
}

// 주문 일련번호: Pro-0001 형식
export function formatOrderSerial(seq: number): string {
  return `Pro-${String(seq).padStart(4, "0")}`;
}
