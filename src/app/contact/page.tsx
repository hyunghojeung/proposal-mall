import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { ContactView } from "@/components/ContactView";

export const metadata: Metadata = { title: "고객문의 | 제안서박스몰" };

export default function ContactPage() {
  return (
    <>
      <NoticeBar />
      <Header />
      <main>
        <ContactView />
      </main>
      <Footer />
    </>
  );
}
