import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";
import { ProductHeroCard } from "@/components/products/ProductHeroCard";

export const metadata = { title: "전체상품 | 제안서박스몰" };
export const dynamic = "force-dynamic";

/* ── 카테고리 매핑 ─────────────────────────────────────────────── */
const CATEGORY_PARAMS: Record<string, ProductCategory> = {
  "carrier-box":    ProductCategory.CARRIER_BOX,
  "magnetic-box":   ProductCategory.MAGNETIC_BOX,
  "binding-3-ring": ProductCategory.BINDING_3_RING,
  "binding-pt":     ProductCategory.BINDING_PT,
  "binding-hardcover": ProductCategory.BINDING_HARDCOVER,
  "paper-inner":    ProductCategory.PAPER_INNER,
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.CARRIER_BOX]:       "제안서캐리어박스",
  [ProductCategory.MAGNETIC_BOX]:      "자석박스",
  [ProductCategory.BINDING_3_RING]:    "3공바인더",
  [ProductCategory.BINDING_PT]:        "PT용바인더",
  [ProductCategory.BINDING_HARDCOVER]: "하드커버스프링제본",
  [ProductCategory.PAPER_INNER]:       "내지 인쇄",
};

/* ── 필터 칩 ───────────────────────────────────────────────────── */
const FILTER_CHIPS: { label: string; type: string | null }[] = [
  { label: "전체",     type: null },
  { label: "표준 사이즈", type: "standard" },
  { label: "맞춤 제작",  type: "custom" },
  { label: "A4 / A3",  type: "a4a3" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { cat?: string; q?: string; type?: string };
}) {
  const catParam  = searchParams.cat;
  const typeParam = searchParams.type;
  const q         = searchParams.q?.trim();

  const category = catParam ? CATEGORY_PARAMS[catParam] : undefined;

  /* type 파라미터에 따른 추가 필터 */
  type NameFilter = { contains: string; mode: "insensitive" };
  type CatFilter  = { in: ProductCategory[] };
  let typeWhere: { name?: NameFilter; category?: CatFilter } = {};

  if (typeParam === "standard") {
    typeWhere = { name: { contains: "표준", mode: "insensitive" } };
  } else if (typeParam === "custom") {
    typeWhere = { name: { contains: "커스텀", mode: "insensitive" } };
  } else if (typeParam === "a4a3") {
    typeWhere = {
      category: {
        in: [
          ProductCategory.BINDING_3_RING,
          ProductCategory.BINDING_PT,
          ProductCategory.BINDING_HARDCOVER,
          ProductCategory.PAPER_INNER,
        ],
      },
    };
  }

  const products = await prisma.product
    .findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...typeWhere,
      },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => []);

  const activeLabel = category ? CATEGORY_LABELS[category] : "전체";

  return (
    <>
      <NoticeBar />
      <Header />

      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-10">

        {/* ── 브레드크럼 ── */}
        <nav className="flex flex-wrap items-center gap-1 pb-5 text-[14px] text-ink-sub">
          <Link href="/" className="hover:text-ink">홈</Link>
          <span className="mx-1.5 text-ink-del">›</span>
          <Link href="/products" className="hover:text-ink">전체상품</Link>
          {category && (
            <>
              <span className="mx-1.5 text-ink-del">›</span>
              <span className="font-medium text-ink">{activeLabel}</span>
            </>
          )}
        </nav>

        {/* ── 타이틀 + 상품 수 ── */}
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-[28px] font-black tracking-tight text-ink">{activeLabel}</h1>
          <p className="text-[14px] text-ink-sub">
            총 <b className="font-bold text-ink">{products.length}</b>개 상품
          </p>
        </div>

        {/* ── 필터 칩 ── */}
        <div className="mb-8 flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => {
            const isActive = chip.type === null
              ? !typeParam && !catParam && !q
              : typeParam === chip.type;
            const href = chip.type ? `/products?type=${chip.type}` : "/products";
            return (
              <Link
                key={chip.label}
                href={href}
                className={`rounded-full px-5 py-2 text-[14px] font-bold transition-all ${
                  isActive
                    ? "bg-ink text-white shadow-sm"
                    : "border border-line bg-white text-ink hover:border-ink hover:shadow-sm"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>

        {/* ── 상품 히어로 카드 그리드 ── */}
        {products.length === 0 ? (
          <div className="py-20 text-center text-[16px] text-ink-sub">
            등록된 상품이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {products.map((p, i) => (
              <ProductHeroCard
                key={p.id}
                product={{
                  id:            p.id,
                  name:          p.name,
                  slug:          p.slug,
                  description:   p.description ?? null,
                  thumbnail:     p.thumbnail   ?? null,
                  category:      p.category,
                  contentBlocks: p.contentBlocks,
                }}
                index={i}
                total={products.length}
                flip={i % 2 === 1}
              />
            ))}
          </div>
        )}

        {/* ── CTA 배너 ── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl bg-ink px-8 py-10 md:flex-row">
          <div className="text-center md:text-left">
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">
              Need a different size?
            </p>
            <h3 className="text-[22px] font-black text-white md:text-[24px]">
              찾으시는 제품이 없으신가요?
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">
              대량 주문·OEM 문의는 영업일 기준 24시간 이내에 답변드립니다.
            </p>
          </div>
          <Link
            href="/contact?tab=inquiry"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            1:1 문의하기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

      </main>

      <Footer />
    </>
  );
}
