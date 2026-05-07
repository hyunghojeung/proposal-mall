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
        <h1 className="border-b border-line pb-5 text-[26px] font-black tracking-tight text-ink">
          결제
          {isAdmin && (
            <span className="ml-3 align-middle rounded-sm bg-brand px-2 py-0.5 text-[12px] font-bold text-white">
              관리자 테스트 모드
            </span>
          )}
        </h1>
        <div className="mt-8">
          <Suspense
            fallback={<p className="py-10 text-center text-[15px] text-ink-sub">불러오는 중…</p>}
          >
            <CheckoutForm isAdmin={isAdmin} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
