import { redirect } from "next/navigation";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { ProductForm } from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "새 상품 | 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminProductNewPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const cats = await prisma.categoryConfig
    .findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
    .catch(() => []);

  const categories = cats.map((c) => ({ enumKey: c.enumKey, label: c.label }));
  const firstEnum = (categories[0]?.enumKey ?? "CARRIER_BOX") as ProductCategory;

  return (
    <AdminShell active="products" title="새 상품 등록">
      <ProductForm
        mode="create"
        categories={categories}
        initial={{
          slug: "",
          name: "",
          category: firstEnum,
          binding: BindingType.NONE,
          paper: PaperType.NONE,
          description: "",
          thumbnail: "",
          images: [],
          contentBlocks: [],
          basePrice: 0,
          sortOrder: 0,
          isActive: true,
          optionGroups: [],
        }}
      />
    </AdminShell>
  );
}
