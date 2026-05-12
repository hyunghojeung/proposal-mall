import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { DiagramAdminClient } from "@/components/DiagramAdminClient";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "전개도 관리 | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminDiagramsPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const diagrams = await prisma.diagram
    .findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] })
    .catch(() => []);

  return (
    <AdminShell active="diagrams" title="전개도 관리">
      <DiagramAdminClient
        initialDiagrams={diagrams.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          category: d.category,
          fileUrl: d.fileUrl,
          fileName: d.fileName,
          fileSize: d.fileSize,
          downloadCount: d.downloadCount,
          isActive: d.isActive,
          sortOrder: d.sortOrder,
        }))}
      />
    </AdminShell>
  );
}
