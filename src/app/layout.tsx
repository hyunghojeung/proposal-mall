import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "제안서몰 — 제안서 제작 전문 쇼핑몰",
  description: "B2B 제안서 인쇄·제본·박스 전문. 빠른 제작, 합리적인 가격.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://proposal.blackcopy.co.kr",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.variable} antialiased`}>{children}</body>
    </html>
  );
}
