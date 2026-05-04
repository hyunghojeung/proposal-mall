import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "결제 | 제안서몰" };

export default function CheckoutPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">
        <h1 className="border-b border-line pb-5 text-[24px] font-black tracking-tight text-ink">
          결제
        </h1>
        <div className="mt-8">
          <Suspense
            fallback={<p className="py-10 text-center text-[14px] text-ink-sub">불러오는 중…</p>}
          >
            <CheckoutForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
