import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

export const metadata = { title: "공지사항 | 제안서몰" };

export default function NoticesPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-16">
        <h1 className="text-[28px] font-black tracking-tight text-ink">공지사항</h1>
        <p className="mt-3 text-[14px] text-ink-sub">
          공지사항은 후속 작업에서 `/api/notices` 데이터로 채워집니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
