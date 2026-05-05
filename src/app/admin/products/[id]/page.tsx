import { redirect, notFound } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { ProductForm, type ContentBlock } from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const product = await prisma.product
    .findUnique({
      where: { id },
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { values: { orderBy: { sortOrder: "asc" } } },
        },
      },
    })
    .catch(() => null);

  if (!product) notFound();

  return (
    <AdminShell active="products" title={`상품 편집 — ${product.name}`}>
      <ProductForm
        mode="edit"
        initial={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          binding: product.binding,
          paper: product.paper,
          description: product.description ?? "",
          thumbnail: product.thumbnail ?? "",
          images: product.images ?? [],
          contentBlocks: (product.contentBlocks as ContentBlock[]) ?? [],
          basePrice: product.basePrice,
          sortOrder: product.sortOrder,
          isActive: product.isActive,
          optionGroups: product.optionGroups.map((g) => ({
            name: g.name,
            required: g.required,
            sortOrder: g.sortOrder,
            values: g.values.map((v) => ({
              label: v.label,
              priceDelta: v.priceDelta,
              sortOrder: v.sortOrder,
            })),
          })),
        }}
      />
    </AdminShell>
  );
}
