import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

export const metadata = {
  title: "전체상품 | 제안서몰",
};

export default function ProductsPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-16">
        <h1 className="text-[28px] font-black tracking-tight text-ink">전체상품</h1>
        <p className="mt-3 text-[14px] text-ink-sub">
          상품 목록은 곧 데이터베이스 연동과 함께 제공됩니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
