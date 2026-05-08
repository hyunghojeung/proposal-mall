import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { CartView } from "@/components/CartView";

export const metadata = { title: "장바구니 | 제안서박스몰" };

export default function CartPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">
        <h1 className="border-b border-line pb-5 text-[24px] font-black tracking-tight text-ink">
          장바구니
        </h1>
        <div className="mt-8">
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}
