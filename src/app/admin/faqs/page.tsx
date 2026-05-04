import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { FaqAdminClient } from "@/components/FaqAdminClient";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "FAQ | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminFaqsPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const faqs = await prisma.faq
    .findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] })
    .catch(() => []);

  return (
    <AdminShell active="faqs" title="FAQ 관리">
      <FaqAdminClient initialFaqs={faqs.map((f) => ({
        id: f.id,
        category: f.category,
        question: f.question,
        answer: f.answer,
        sortOrder: f.sortOrder,
        isActive: f.isActive,
      }))} />
    </AdminShell>
  );
}
