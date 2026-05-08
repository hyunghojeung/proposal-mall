import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const notice = await prisma.notice
    .findUnique({ where: { id: Number(params.id) } })
    .catch(() => null);
  return { title: notice ? `${notice.title} | 공지사항 | 제안서몰` : "공지사항 | 제안서몰" };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const notice = await prisma.notice
    .findUnique({ where: { id, isActive: true } })
    .catch(() => null);

  if (!notice) notFound();

  // 이전·다음 글 (isActive만)
  const [prev, next] = await Promise.all([
    prisma.notice
      .findFirst({
        where: { isActive: true, createdAt: { lt: notice.createdAt } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      })
      .catch(() => null),
    prisma.notice
      .findFirst({
        where: { isActive: true, createdAt: { gt: notice.createdAt } },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true },
      })
      .catch(() => null),
  ]);

  return (
    <>
      <NoticeBar />
      <Header />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 pb-20 pt-12">

        {/* 브레드크럼 */}
        <nav className="mb-6 flex items-center gap-1.5 text-[12px] text-ink-sub">
          <Link href="/" className="hover:text-ink">홈</Link>
          <span>/</span>
          <Link href="/notices" className="hover:text-ink">공지사항</Link>
          <span>/</span>
          <span className="text-ink">상세</span>
        </nav>

        {/* 본문 카드 */}
        <div className="overflow-hidden rounded border border-line bg-white">
          {/* 글 헤더 */}
          <div className="border-b border-line px-7 py-6">
            <div className="mb-2 flex items-center gap-2">
              {notice.isPinned && (
                <span className="rounded-[3px] border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                  공지
                </span>
              )}
            </div>
            <h1 className="text-[20px] font-black leading-snug text-ink">{notice.title}</h1>
            <p className="mt-2 text-[13px] text-ink-sub">
              {new Date(notice.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* 글 본문 */}
          <div className="px-7 py-8">
            <div className="min-h-[120px] whitespace-pre-wrap text-[14px] leading-[1.9] text-ink">
              {notice.content}
            </div>
          </div>
        </div>

        {/* 이전·다음 글 */}
        <div className="mt-3 overflow-hidden rounded border border-line bg-white">
          {next && (
            <Link
              href={`/notices/${next.id}`}
              className="flex items-center gap-3 border-b border-line px-5 py-3.5 text-[13px] transition-colors hover:bg-[#FAFAFA]"
            >
              <span className="w-14 flex-shrink-0 text-ink-sub">▲ 다음글</span>
              <span className="truncate text-ink">{next.title}</span>
            </Link>
          )}
          {prev && (
            <Link
              href={`/notices/${prev.id}`}
              className="flex items-center gap-3 px-5 py-3.5 text-[13px] transition-colors hover:bg-[#FAFAFA]"
            >
              <span className="w-14 flex-shrink-0 text-ink-sub">▼ 이전글</span>
              <span className="truncate text-ink">{prev.title}</span>
            </Link>
          )}
        </div>

        {/* 목록으로 버튼 */}
        <div className="mt-5 flex justify-center">
          <Link
            href="/notices"
            className="flex items-center gap-2 rounded border border-line bg-white px-5 py-2.5 text-[13px] font-bold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            목록으로
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
