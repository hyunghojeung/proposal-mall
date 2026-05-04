import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { NoticeAdminClient } from "@/components/NoticeAdminClient";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "공지사항 | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminNoticesPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const notices = await prisma.notice
    .findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] })
    .catch(() => []);

  return (
    <AdminShell active="notices" title="공지사항 관리">
      <NoticeAdminClient
        initialNotices={notices.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          isPinned: n.isPinned,
          isActive: n.isActive,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </AdminShell>
  );
}
