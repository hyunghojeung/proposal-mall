// localStorage-backed cart store. Client-only.

export interface CartItem {
  id: string; // cart line id
  productId: number;
  slug: string;
  productName: string;
  options: Record<string, string>;
  quantity: number;
  pageCount?: number;
  unitPrice: number;
  subtotal: number;    // VAT 포함 합계
  vatAmount?: number;  // 부가세
}

const STORAGE_KEY = "proposal-mall:cart:v1";
const CART_EVENT = "proposal-mall:cart:change";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, "id">): CartItem {
  const items = readCart();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem: CartItem = { id, ...item };
  items.push(newItem);
  writeCart(items);
  return newItem;
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter((it) => it.id !== id));
}

export function updateCartQuantity(id: string, quantity: number) {
  const items = readCart().map((it) => {
    if (it.id !== id) return it;
    const newQty = Math.max(1, quantity);
    return {
      ...it,
      quantity: newQty,
      subtotal: it.unitPrice * newQty,
    };
  });
  writeCart(items);
}

export function clearCart() {
  writeCart([]);
}

export function subscribeCart(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CART_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CART_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, it) => s + it.subtotal, 0);
}
