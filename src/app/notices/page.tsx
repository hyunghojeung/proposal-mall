import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "공지사항 | 제안서몰" };
export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const notices = await prisma.notice
    .findMany({
      where: { isActive: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 pb-20 pt-12">
        {/* 페이지 타이틀 */}
        <div className="mb-8 border-b border-line pb-5">
          <h1 className="text-[26px] font-black tracking-tight text-ink">공지사항</h1>
          <p className="mt-1.5 text-[13px] text-ink-sub">제안서몰의 새소식과 안내를 확인하세요.</p>
        </div>

        {/* 목록 */}
        {notices.length === 0 ? (
          <div className="rounded border border-line bg-white py-20 text-center">
            <p className="text-[14px] text-ink-sub">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-line bg-white">
            {/* 헤더 행 */}
            <div className="grid grid-cols-[64px_1fr_110px] border-b border-line bg-bg px-5 py-3 text-[12px] font-bold text-ink-sub">
              <span>번호</span>
              <span>제목</span>
              <span className="text-right">작성일</span>
            </div>

            {notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                className={`grid grid-cols-[64px_1fr_110px] items-center border-b border-line px-5 py-4 transition-colors last:border-none hover:bg-[#FAFAFA] ${
                  notice.isPinned ? "bg-orange-50/40" : ""
                }`}
              >
                {/* 번호 */}
                <span className="text-[13px] text-ink-sub">
                  {notice.isPinned ? (
                    <span className="inline-block rounded-[3px] border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                      공지
                    </span>
                  ) : (
                    notices.filter((n) => !n.isPinned).length -
                    notices.filter((n) => !n.isPinned).findIndex((n) => n.id === notice.id)
                  )}
                </span>

                {/* 제목 */}
                <span className="truncate text-[14px] font-medium text-ink">
                  {notice.title}
                </span>

                {/* 날짜 */}
                <span className="text-right text-[13px] text-ink-sub">
                  {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
