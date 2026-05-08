import Link from "next/link";
import { prisma } from "@/lib/prisma";

// 고정 공지 우선, 없으면 최신 공지 — 없으면 null
async function getLatestNotice() {
  const notice = await prisma.notice
    .findFirst({
      where: { isActive: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true },
    })
    .catch(() => null);
  return notice;
}

export async function NoticeBar() {
  const notice = await getLatestNotice();

  // 공지가 없으면 바 자체를 숨김
  if (!notice) return null;

  return (
    <Link
      href={`/notices/${notice.id}`}
      className="flex items-center justify-center gap-6 bg-brand px-6 py-2.5 transition-colors hover:bg-brand-dark"
    >
      <p className="flex-1 text-center text-[13px] font-medium text-white">
        {notice.title}
      </p>
      <span className="shrink-0 whitespace-nowrap rounded-full border border-white/55 px-3 py-[3px] text-[12px] font-bold text-white">
        자세히 →
      </span>
    </Link>
  );
}
