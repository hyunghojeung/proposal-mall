"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductCategory } from "@prisma/client";
import { addToCart } from "@/lib/cart";
import type { ContentBlock } from "@/components/ProductForm";

interface OptionGroupClient {
  id: number;
  name: string;
  required: boolean;
  values: { id: number; label: string; priceDelta: number }[];
}

interface Props {
  product: {
    id: number;
    slug: string;
    name: string;
    category: ProductCategory;
    description: string | null;
    images: string[];
    contentBlocks: ContentBlock[];
    basePrice: number;
    optionGroups: OptionGroupClient[];
  };
}

interface QuoteResp {
  unitPrice: number;
  subtotal: number;
  qtyTier: string;
  breakdown: string;
  error?: string;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  CARRIER_BOX: "제안서캐리어박스",
  MAGNETIC_BOX: "자석박스",
  BINDING_3_RING: "3공바인더",
  BINDING_PT: "PT용바인더",
  BINDING_HARDCOVER: "하드커버스프링제본",
  PAPER_INNER: "내지 인쇄",
};

const CATEGORY_PARAMS: Record<ProductCategory, string> = {
  CARRIER_BOX: "carrier-box",
  MAGNETIC_BOX: "magnetic-box",
  BINDING_3_RING: "binding-3-ring",
  BINDING_PT: "binding-pt",
  BINDING_HARDCOVER: "binding-hardcover",
  PAPER_INNER: "paper-inner",
};

// ── 이미지 갤러리 ──────────────────────────────────────────
function ImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded border border-line bg-bg h-[220px] md:h-[460px]">
        <span className="text-[15px] text-ink-sub">이미지 없음</span>
      </div>
    );
  }

  return (
    <div>
      {/* 메인 이미지 — 모바일 220px, 데스크탑 460px */}
      <div className="w-full overflow-hidden rounded border border-line bg-bg h-[220px] md:h-[460px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt="상품 이미지"
          className="h-full w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors md:h-20 md:w-20 ${
                i === active ? "border-brand" : "border-line"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`썸네일 ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 콘텐츠 블록 렌더러 ───────────────────────────────────────
function ContentBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="mb-8 text-[22px] font-black tracking-tight text-ink">상품 상세 설명</h2>
      <div className="space-y-10">
        {blocks.map((block, i) => {

          /* 텍스트 */
          if (block.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-sub">
                {block.content}
              </p>
            );
          }

          /* 이미지 */
          if (block.type === "image") {
            return (
              <figure key={i} className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.url} alt={block.caption || "상품 이미지"}
                  className="w-full rounded border border-line object-contain" />
                {block.caption && (
                  <figcaption className="mt-2 text-center text-[14px] text-ink-sub">{block.caption}</figcaption>
                )}
              </figure>
            );
          }

          /* 이미지 + 텍스트 (좌우) */
          if (block.type === "image_text") {
            return (
              <div key={i} className={`flex flex-col gap-6 md:flex-row md:items-center ${
                block.imagePosition === "right" ? "md:flex-row-reverse" : ""
              }`}>
                <div className="w-full min-w-0 md:w-1/2">
                  {block.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={block.imageUrl} alt={block.title || "이미지"}
                      className="w-full rounded border border-line object-contain" />
                  )}
                </div>
                <div className="w-full min-w-0 md:w-1/2">
                  {block.title && (
                    <h3 className="mb-3 text-[20px] font-black tracking-tight text-ink">{block.title}</h3>
                  )}
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-sub">{block.content}</p>
                </div>
              </div>
            );
          }

          /* 특징 그리드 */
          if (block.type === "feature_grid") {
            return (
              <div key={i}>
                {block.heading && (
                  <h3 className="mb-6 text-[20px] font-black tracking-tight text-ink">{block.heading}</h3>
                )}
                <div className={`grid gap-4 grid-cols-1 ${block.columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  {block.items.map((item, ii) => (
                    <div key={ii} className="rounded border border-line bg-bg p-5">
                      {item.icon && (
                        <div className="mb-2 text-[26px] font-black text-brand">{item.icon}</div>
                      )}
                      {item.title && (
                        <h4 className="mb-1 text-[16px] font-bold text-ink">{item.title}</h4>
                      )}
                      {item.desc && (
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-sub">{item.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          /* 배너 */
          if (block.type === "banner") {
            return (
              <div key={i} className="relative overflow-hidden rounded-xl"
                style={{ backgroundImage: `url(${block.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div className="absolute inset-0 bg-black/50" />
                <div className={`relative z-10 px-8 py-14 ${block.align === "center" ? "text-center" : "text-left"}`}>
                  {block.title && (
                    <h3 className="text-[24px] font-black text-white md:text-[32px]">{block.title}</h3>
                  )}
                  {block.subtitle && (
                    <p className="mt-2 text-[15px] text-white/80">{block.subtitle}</p>
                  )}
                </div>
              </div>
            );
          }

          /* 구분선 */
          if (block.type === "divider") {
            return (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="flex-1 border-t border-line" />
                {block.label && (
                  <span className="shrink-0 text-[14px] font-bold text-ink-sub">{block.label}</span>
                )}
                <div className="flex-1 border-t border-line" />
              </div>
            );
          }

          return null;
        })}
      </div>
    </section>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const isPaper = product.category === ProductCategory.PAPER_INNER;

  const initialOptions = useMemo(() => {
    const o: Record<string, string> = {};
    for (const g of product.optionGroups) {
      if (g.values[0]) o[g.name] = g.values[0].label;
    }
    return o;
  }, [product.optionGroups]);

  const [options, setOptions] = useState<Record<string, string>>(initialOptions);
  const [quantity, setQuantity] = useState(1);
  const [pageCount, setPageCount] = useState(isPaper ? 100 : 0);
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const localUnitPrice = useMemo(() => {
    let price = product.basePrice;
    for (const g of product.optionGroups) {
      const selectedLabel = options[g.name];
      if (!selectedLabel) continue;
      const val = g.values.find((v) => v.label === selectedLabel);
      if (val) price += val.priceDelta;
    }
    return price;
  }, [product.basePrice, product.optionGroups, options]);

  const displayUnitPrice = quote?.unitPrice ?? (localUnitPrice > 0 ? localUnitPrice : null);
  const displaySubtotal = quote?.subtotal ?? (localUnitPrice > 0 ? localUnitPrice * quantity : null);

  const reqIdRef  = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ① 즉시: 낡은 quote 제거 → localUnitPrice 가 바로 표시됨 (지연 없음)
    setQuote(null);
    setQuoteErr(null);

    // ② 이전 타이머 취소 (연속 클릭·타이핑 중복 호출 방지)
    if (timerRef.current) clearTimeout(timerRef.current);

    // ③ 300 ms 디바운스 후 API 호출 (DB 단가표 기반 정밀 계산)
    timerRef.current = setTimeout(() => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      const payload = {
        slug: product.slug,
        options,
        quantity,
        ...(isPaper ? { pageCount } : {}),
      };
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (r) => {
          const data = (await r.json()) as QuoteResp;
          if (reqId !== reqIdRef.current) return;
          if (!r.ok) {
            setQuoteErr(data.error ?? "가격 계산 실패");
          } else {
            setQuote(data);
            setQuoteErr(null);
          }
        })
        .catch(() => {
          if (reqId !== reqIdRef.current) return;
          setQuoteErr("네트워크 오류");
        })
        .finally(() => {
          if (reqId === reqIdRef.current) setLoading(false);
        });
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [product.slug, options, quantity, pageCount, isPaper]);

  function handleAddToCart() {
    const unitPrice = displayUnitPrice;
    const subtotal = displaySubtotal;
    if (!unitPrice || !subtotal) return;
    const vatAmount = Math.round(subtotal * 0.1);
    const totalWithVat = Math.round(subtotal * 1.1);
    addToCart({
      productId: product.id,
      slug: product.slug,
      productName: product.name,
      options,
      quantity,
      pageCount: isPaper ? pageCount : undefined,
      unitPrice,
      subtotal: totalWithVat,
      vatAmount,
    });
    router.push("/cart");
  }

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* 좌측: 이미지 갤러리 */}
        <div className="min-w-0">
          <ImageGallery images={product.images} />
        </div>

        {/* 우측: 옵션 + 가격 */}
        <div className="min-w-0">
          <Link
            href={`/products?cat=${CATEGORY_PARAMS[product.category]}`}
            className="mb-2 inline-block text-[14px] font-medium text-brand hover:underline"
          >
            {CATEGORY_LABELS[product.category]}
          </Link>
          <h1 className="mb-3 text-[28px] font-black tracking-tight text-ink">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-[15px] leading-relaxed text-ink-sub">
              {product.description}
            </p>
          )}
          {product.basePrice > 0 && (
            <p className="mt-3 text-[24px] font-black tracking-tight text-ink">
              {product.basePrice.toLocaleString()}원
            </p>
          )}

          {/* 통합 카드: 옵션선택 + 수량 + 가격 */}
          <div className="mt-5 overflow-hidden rounded border border-line">

            {/* 옵션 그룹 — 모바일: 라벨 위 / 버튼 아래 (세로형) */}
            {product.optionGroups.map((g) => (
              <div key={g.id} className="border-b border-line px-4 py-3">
                <p className="mb-2 text-[13px] font-bold text-ink-sub">{g.name}</p>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((v) => {
                    const selected = options[g.name] === v.label;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setOptions((o) => ({ ...o, [g.name]: v.label }))}
                        className={`flex items-center gap-1 rounded border px-3 py-1.5 text-[14px] transition-colors ${
                          selected
                            ? "border-brand bg-brand-light font-bold text-brand"
                            : "border-line text-ink hover:border-brand/60 hover:text-brand"
                        }`}
                      >
                        {v.label}
                        {v.priceDelta > 0 && (
                          <span className={`text-[12px] ${selected ? "text-brand" : "text-ink-sub"}`}>
                            +{v.priceDelta.toLocaleString()}원
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 페이지 수 (내지 인쇄) — 세로형 */}
            {isPaper && (
              <div className="border-b border-line px-4 py-3">
                <p className="mb-2 text-[13px] font-bold text-ink-sub">페이지 수</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={pageCount}
                    onChange={(e) => setPageCount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-24 rounded border border-line px-3 py-1.5 text-[15px] outline-none focus:border-brand"
                  />
                  <span className="text-[12px] text-ink-sub">구간: 50 / 51~100 / 101쪽↑</span>
                </div>
              </div>
            )}

            {/* 수량 — 세로형 */}
            <div className="border-b border-line px-4 py-3">
              <p className="mb-2 text-[13px] font-bold text-ink-sub">수량</p>
              <div className="flex items-stretch overflow-hidden rounded border border-line w-fit">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 text-[18px] text-ink hover:bg-bg"
                  aria-label="수량 감소"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 border-0 border-x border-line bg-transparent text-center text-[15px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-2 text-[18px] text-ink hover:bg-bg"
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
            </div>

            {/* 공급가 + 부가세 + 합계 */}
            <div className="bg-bg px-5 py-5">
              {displaySubtotal ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-ink-sub">공급가</span>
                    <span className="text-[15px] text-ink">
                      {displaySubtotal.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] text-ink-sub">부가세 (VAT 10%)</span>
                    <span className="text-[15px] text-ink">
                      {Math.round(displaySubtotal * 0.1).toLocaleString()}원
                    </span>
                  </div>
                  <div className="border-t border-line pt-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[16px] font-bold text-ink">합계 (VAT 포함)</span>
                      <span className="text-[22px] font-black tracking-tight text-brand md:text-[28px]">
                        {Math.round(displaySubtotal * 1.1).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  {/* API 정밀계산 진행 중 표시 (가격은 이미 보임) */}
                  {loading && (
                    <p className="text-[12px] text-ink-del">정밀 계산 중…</p>
                  )}
                </div>
              ) : quoteErr ? (
                <p className="text-[15px] font-medium text-brand">{quoteErr}</p>
              ) : loading ? (
                <p className="text-[15px] text-ink-sub">계산 중…</p>
              ) : (
                <p className="text-[15px] text-ink-sub">단가가 설정되지 않았습니다.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!displaySubtotal}
            className="mt-5 w-full rounded bg-brand py-4 text-[17px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            장바구니 담기
          </button>
        </div>
      </div>

      {/* 하단: 상품 상세 내용 */}
      <ContentBlockRenderer blocks={product.contentBlocks} />
    </>
  );
}
