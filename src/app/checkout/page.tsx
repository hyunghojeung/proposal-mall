import { Suspense } from "react";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { CheckoutForm } from "@/components/CheckoutForm";
import { isAdminAuthenticated } from "@/lib/auth";

export const metadata = { title: "결제 | 제안서몰" };

export default function CheckoutPage() {
  const isAdmin = isAdminAuthenticated();

  return (
    <>
      {/* 카카오 주소 검색 API */}
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">
        <Suspense
          fallback={<p className="py-10 text-center text-[15px] text-ink-sub">불러오는 중…</p>}
        >
          <CheckoutForm isAdmin={isAdmin} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
