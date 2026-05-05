import { redirect } from "next/navigation";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { ProductForm } from "@/components/ProductForm";

export const metadata = { title: "새 상품 | 관리자" };
export const dynamic = "force-dynamic";

export default function AdminProductNewPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");
  return (
    <AdminShell active="products" title="새 상품 등록">
      <ProductForm
        mode="create"
        initial={{
          slug: "",
          name: "",
          category: ProductCategory.CARRIER_BOX,
          binding: BindingType.NONE,
          paper: PaperType.NONE,
          description: "",
          thumbnail: "",
          images: [],
          contentBlocks: [],
          sortOrder: 0,
          isActive: true,
          optionGroups: [],
        }}
      />
    </AdminShell>
  );
}
