import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

export const metadata = { title: "주문현황 | 제안서몰" };

export default function OrdersPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-16">
        <h1 className="text-[28px] font-black tracking-tight text-ink">주문현황</h1>
        <p className="mt-3 text-[14px] text-ink-sub">
          실시간 주문 현황은 후속 작업에서 표시됩니다 (`/api/orders`).
        </p>
      </main>
      <Footer />
    </>
  );
}
