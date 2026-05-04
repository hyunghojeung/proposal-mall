import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

export const metadata = { title: "고객문의 | 제안서몰" };

export default function ContactPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-16">
        <h1 className="text-[28px] font-black tracking-tight text-ink">고객문의</h1>
        <p className="mt-3 text-[14px] text-ink-sub">
          1:1 문의 / FAQ / 문의내역 화면은 후속 작업에서 구현됩니다.
        </p>
        <p className="mt-2 text-[13px] text-ink-sub">
          긴급 문의: <a href="mailto:blackcopy2@naver.com" className="text-brand hover:underline">blackcopy2@naver.com</a>
        </p>
      </main>
      <Footer />
    </>
  );
}
