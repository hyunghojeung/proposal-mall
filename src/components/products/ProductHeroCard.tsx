import Link from "next/link";

/* ────────────────────────────────────────────────────────────────
 * contentBlocks 안에 { type: "hero_meta", ... } 블록이 있으면
 * 그 데이터를 히어로 카드에 사용합니다.
 * 없으면 기본값(name, description, thumbnail)으로 폴백합니다.
 * ──────────────────────────────────────────────────────────────── */
interface HeroMeta {
  subtitle?: string;           // 이탤릭 서브타이틀 (영문)
  categoryLabel?: string;      // 오른쪽 레이블 (예: PROPOSAL CARRIER)
  tags?: string[];             // 이미지 위 & 아래 태그 pill
  features?: string[];         // 주황색 점 목록
  highlights?: string[];       // 하단 흰 pill 하이라이트
  ctaPrimary?: string;         // 메인 버튼 텍스트
  ctaSecondary?: string;       // 서브 버튼 텍스트
  ctaSecondaryHref?: string;   // 서브 버튼 href (없으면 /products/slug#order)
  bg?: string;                 // 카드 배경색 (기본: 짝수 #F5F2EE, 홀수 #ffffff)
}

interface HeroProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  category: string;
  contentBlocks: unknown;
}

interface Props {
  product: HeroProduct;
  index: number;    // 0-based
  total: number;
  flip?: boolean;   // true → 이미지를 오른쪽으로
}

function parseHeroMeta(contentBlocks: unknown): HeroMeta {
  if (!Array.isArray(contentBlocks)) return {};
  const block = contentBlocks.find(
    (b: unknown) =>
      typeof b === "object" &&
      b !== null &&
      (b as Record<string, unknown>).type === "hero_meta",
  );
  return (block as HeroMeta | undefined) ?? {};
}

export function ProductHeroCard({ product, index, total, flip = false }: Props) {
  const meta = parseHeroMeta(product.contentBlocks);

  const bg              = meta.bg           ?? "#F5F2EE";
  const categoryLabel   = meta.categoryLabel ?? "";
  const subtitle        = meta.subtitle      ?? "";
  const tags            = meta.tags          ?? [];
  const features        = meta.features      ?? [];
  const highlights      = meta.highlights    ?? [];
  const ctaPrimary      = meta.ctaPrimary    ?? "상세 보기";
  const ctaSecondary    = meta.ctaSecondary  ?? "";
  const ctaSecondaryHref = meta.ctaSecondaryHref ?? `/products/${product.slug}#order`;

  const num = String(index + 1).padStart(2, "0");
  const tot = String(total).padStart(2, "0");

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[20px]"
      style={{ backgroundColor: bg, minHeight: 420 }}
    >
      <div className="flex flex-1 flex-col p-8 lg:p-10">

        {/* ── 번호 + 카테고리 레이블 ── */}
        <div className="mb-6 flex items-center gap-3 text-[11px] font-bold tracking-[0.14em] text-ink-sub">
          <span>{num} / {tot}</span>
          <span className="h-px flex-1 bg-ink-del" />
          {categoryLabel && <span>{categoryLabel}</span>}
        </div>

        {/* ── 이미지 + 텍스트 ── */}
        <div
          className={`flex flex-1 flex-col gap-8 md:flex-row md:items-center ${
            flip ? "md:flex-row-reverse" : ""
          }`}
        >
          {/* 이미지 영역 */}
          <div className="relative flex flex-shrink-0 items-center justify-center md:w-[200px] lg:w-[240px]">
            {/* 상단 태그 pill */}
            {tags[0] && (
              <span className="absolute -top-3 left-0 z-10 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 text-[10px] font-bold text-ink-sub shadow-sm">
                {tags[0]}
              </span>
            )}

            {product.thumbnail ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.thumbnail}
                alt={product.name}
                className="h-[180px] w-auto object-contain drop-shadow-sm lg:h-[220px]"
              />
            ) : (
              <div className="h-[180px] w-[180px] rounded-2xl border border-line bg-white/60" />
            )}

            {/* 하단 태그 pill */}
            {tags[1] && (
              <span className="absolute -bottom-3 right-0 z-10 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 text-[10px] font-bold text-ink-sub shadow-sm">
                {tags[1]}
              </span>
            )}
          </div>

          {/* 텍스트 영역 */}
          <div className="flex-1">
            {/* 제목 */}
            <h2 className="mb-1.5 text-[22px] font-black leading-tight tracking-tight text-ink lg:text-[26px]">
              {product.name}
            </h2>

            {/* 서브타이틀 */}
            {subtitle && (
              <p className="mb-3 text-[13px] font-medium italic text-brand">{subtitle}</p>
            )}

            {/* 설명 */}
            {product.description && (
              <p className="mb-4 line-clamp-3 text-[13px] leading-relaxed text-ink-sub">
                {product.description}
              </p>
            )}

            {/* 피처 목록 */}
            {features.length > 0 && (
              <ul className="mb-4 space-y-1.5">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
                    <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            {/* 하이라이트 pill */}
            {highlights.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {highlights.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-ink-sub"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* CTA 버튼 */}
            <div className="flex flex-wrap gap-2.5">
              <Link
                href={`/products/${product.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand"
              >
                {ctaPrimary}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>

              {ctaSecondary && (
                <Link
                  href={ctaSecondaryHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-5 py-2.5 text-[13px] font-bold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {ctaSecondary}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
