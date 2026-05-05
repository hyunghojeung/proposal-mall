import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { ContentBlock } from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";

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

      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">
        <nav className="flex flex-wrap items-center gap-1 pb-5 text-[13px] text-ink-sub">
          <Link href="/" className="hover:text-ink">홈</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <Link href="/products" className="hover:text-ink">전체상품</Link>
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
