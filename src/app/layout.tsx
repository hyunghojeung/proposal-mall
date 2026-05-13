import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://proposal.blackcopy.co.kr";
const SITE_TITLE = "제안서박스몰 — 제안서 제작 전문 쇼핑몰";
const SITE_DESC  = "B2B 제안서 인쇄·제본·박스 전문. A4/A3 표준·맞춤 제작, 빠른 납기, 합리적인 가격.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESC,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title:       SITE_TITLE,
    description: SITE_DESC,
    url:         SITE_URL,
    siteName:    "제안서박스몰",
    locale:      "ko_KR",
    type:        "website",
    images: [
      {
        url:    "/og-image.png",
        width:  1200,
        height: 630,
        alt:    "제안서박스몰 — 제안서 제작 전문 쇼핑몰",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       SITE_TITLE,
    description: SITE_DESC,
    images:      ["/og-image.png"],
  },
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
