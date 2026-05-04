import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "전체상품 | 제안서몰" };
export const dynamic = "force-dynamic";

const CATEGORY_PARAMS: Record<string, ProductCategory> = {
  "carrier-box": ProductCategory.CARRIER_BOX,
  "magnetic-box": ProductCategory.MAGNETIC_BOX,
  "binding-3-ring": ProductCategory.BINDING_3_RING,
  "binding-pt": ProductCategory.BINDING_PT,
  "binding-hardcover": ProductCategory.BINDING_HARDCOVER,
  "paper-inner": ProductCategory.PAPER_INNER,
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.CARRIER_BOX]: "제안서캐리어박스",
  [ProductCategory.MAGNETIC_BOX]: "자석박스",
  [ProductCategory.BINDING_3_RING]: "3공바인더",
  [ProductCategory.BINDING_PT]: "PT용바인더",
  [ProductCategory.BINDING_HARDCOVER]: "하드커버스프링제본",
  [ProductCategory.PAPER_INNER]: "내지 인쇄",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { cat?: string; q?: string };
}) {
  const catParam = searchParams.cat;
  const category = catParam ? CATEGORY_PARAMS[catParam] : undefined;
  const q = searchParams.q?.trim();

  const products = await prisma.product
    .findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
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
        <nav className="flex flex-wrap items-center gap-1 pb-5 text-[13px] text-ink-sub">
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

        <div className="flex items-baseline justify-between border-y border-line py-4">
          <h1 className="text-[22px] font-black tracking-tight text-ink">{activeLabel}</h1>
          <p className="text-[13px] text-ink-sub">
            총 <b className="font-bold text-ink">{products.length}</b>개 상품
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 ? (
            <li className="col-span-full py-16 text-center text-[14px] text-ink-sub">
              등록된 상품이 없습니다. 시드 데이터를 적용해 주세요.
            </li>
          ) : (
            products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="group block h-full rounded border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_8px_24px_rgba(0,0,0,.06)]"
                >
                  <p className="mb-2 text-[12px] font-medium text-brand">
                    {CATEGORY_LABELS[p.category]}
                  </p>
                  <h3 className="mb-2 text-[16px] font-bold text-ink group-hover:text-brand">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-sub">
                      {p.description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-brand">
                    상세 보기
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </main>

      <Footer />
    </>
  );
}
