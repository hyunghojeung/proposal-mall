import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { CategoryAdminClient } from "@/components/CategoryAdminClient";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "카테고리 관리 | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const rows = await prisma.categoryConfig
    .findMany({ orderBy: { sortOrder: "asc" } })
    .catch(() => []);

  return (
    <AdminShell active="categories" title="카테고리 관리">
      <CategoryAdminClient
        initial={rows.map((r) => ({
          id:          r.id,
          enumKey:     r.enumKey,
          slug:        r.slug,
          label:       r.label,
          description: r.description,
          sortOrder:   r.sortOrder,
          isActive:    r.isActive,
        }))}
      />
    </AdminShell>
  );
}
