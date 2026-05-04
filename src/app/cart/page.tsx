import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

export const metadata = { title: "장바구니 | 제안서몰" };

export default function CartPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-16">
        <h1 className="text-[28px] font-black tracking-tight text-ink">장바구니</h1>
        <p className="mt-3 text-[14px] text-ink-sub">
          장바구니 화면은 후속 작업에서 [reference/cart.html](../../../reference/cart.html) 디자인으로 구현됩니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
