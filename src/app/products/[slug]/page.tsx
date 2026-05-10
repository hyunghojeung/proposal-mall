import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCategory } from "@prisma/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { ContentBlock } from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";

// 카테고리 → URL 파라미터 매핑
const CATEGORY_PARAM: Record<ProductCategory, string> = {
  CARRIER_BOX: "carrier-box",
  MAGNETIC_BOX: "magnetic-box",
  BINDING_3_RING: "binding-3-ring",
  BINDING_PT: "binding-pt",
  BINDING_HARDCOVER: "binding-hardcover",
  PAPER_INNER: "paper-inner",
};

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  CARRIER_BOX: "제안서캐리어박스",
  MAGNETIC_BOX: "자석박스",
  BINDING_3_RING: "3공바인더",
  BINDING_PT: "PT용바인더",
  BINDING_HARDCOVER: "하드커버스프링제본",
  PAPER_INNER: "내지 인쇄",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await prisma.product
    .findUnique({ where: { slug: params.slug } })
    .catch(() => null);
  if (!product) return { title: "상품 | 제안서몰" };
  return {
    title: `${product.name} | 제안서몰`,
    description: product.description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await prisma.product
    .findUnique({
      where: { slug: params.slug },
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { values: { orderBy: { sortOrder: "asc" } } },
        },
      },
    })
    .catch(() => null);

  if (!product || !product.isActive) notFound();

  return (
    <>
      <NoticeBar />
      <Header />

      <main className="mx-auto min-h-[60vh] max-w-page px-4 py-6 md:px-6 md:py-10">
        <nav className="flex flex-wrap items-center gap-1 pb-5 text-[15px] text-ink-sub">
          <Link href="/" className="hover:text-ink">홈</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <Link href="/products" className="hover:text-ink">전체상품</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <Link
            href={`/products?cat=${CATEGORY_PARAM[product.category]}`}
            className="hover:text-ink"
          >
            {CATEGORY_LABEL[product.category]}
          </Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <span className="font-medium text-ink">{product.name}</span>
        </nav>

        <ProductDetailClient
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            category: product.category,
            description: product.description,
            images: product.images ?? [],
            contentBlocks: (product.contentBlocks as ContentBlock[]) ?? [],
            basePrice: (product as typeof product & { basePrice?: number }).basePrice ?? 0,
            optionGroups: product.optionGroups.map((g) => ({
              id: g.id,
              name: g.name,
              required: g.required,
              values: g.values.map((v) => ({
                id: v.id,
                label: v.label,
                priceDelta: v.priceDelta,
              })),
            })),
          }}
        />
      </main>

      <Footer />
    </>
  );
}
