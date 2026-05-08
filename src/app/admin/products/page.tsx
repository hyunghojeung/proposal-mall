import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { ProductRowActions } from "@/components/ProductRowActions";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "상품 관리 | 관리자" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  CARRIER_BOX: "캐리어박스",
  MAGNETIC_BOX: "자석박스",
  BINDING_3_RING: "3공바인더",
  BINDING_PT: "PT용바인더",
  BINDING_HARDCOVER: "하드커버",
  PAPER_INNER: "내지인쇄",
};

export default async function AdminProductsPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const products = await prisma.product
    .findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { _count: { select: { optionGroups: true, orderItems: true } } },
    })
    .catch(() => []);

  return (
    <AdminShell active="products" title="상품 관리">
      <div className="mb-5 flex justify-between">
        <p className="text-[13px] text-ink-sub">
          총 <b>{products.length}</b>개 · 비활성 상품도 포함
        </p>
        <Link
          href="/admin/products/new"
          className="rounded bg-brand px-5 py-2 text-[14px] font-bold text-white hover:bg-brand-dark"
        >
          + 새 상품
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[14px] text-ink-sub">
          등록된 상품이 없습니다.
        </p>
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead className="border-y border-line bg-bg text-left text-[13px] text-ink-sub">
            <tr>
              <th className="px-4 py-3 font-semibold">slug</th>
              <th className="px-4 py-3 font-semibold">상품명</th>
              <th className="px-4 py-3 font-semibold">카테고리</th>
              <th className="px-4 py-3 text-center font-semibold">옵션 그룹</th>
              <th className="px-4 py-3 text-center font-semibold">주문 이력</th>
              <th className="px-4 py-3 text-center font-semibold">정렬</th>
              <th className="px-4 py-3 text-center font-semibold">노출</th>
              <th className="px-4 py-3 text-right font-semibold">액션</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-line align-middle ${p.isActive ? "" : "opacity-60"}`}
              >
                <td className="px-4 py-3 font-mono text-[13px] text-ink-sub">{p.slug}</td>
                <td className="px-4 py-3 font-medium text-ink">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-brand">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-sub">{CATEGORY_LABELS[p.category]}</td>
                <td className="px-4 py-3 text-center text-ink-sub">{p._count.optionGroups}</td>
                <td className="px-4 py-3 text-center text-ink-sub">{p._count.orderItems}</td>
                <td className="px-4 py-3 text-center text-ink-sub">{p.sortOrder}</td>
                <td className="px-4 py-3 text-center">
                  <ProductRowActions
                    id={p.id}
                    isActive={p.isActive}
                    hasOrders={p._count.orderItems > 0}
                    type="toggle"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <ProductRowActions
                    id={p.id}
                    isActive={p.isActive}
                    hasOrders={p._count.orderItems > 0}
                    type="actions"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}
