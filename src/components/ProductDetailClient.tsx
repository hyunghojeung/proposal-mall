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
      <div className="w-full rounded border border-line bg-bg flex items-center justify-center" style={{ height: 420 }}>
        <span className="text-[13px] text-ink-sub">이미지 없음</span>
      </div>
    );
  }

  return (
    <div>
      {/* 메인 이미지 — 고정 높이로 오른쪽 옵션 영역과 균형 맞춤 */}
      <div className="w-full overflow-hidden rounded border border-line bg-bg" style={{ height: 420 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active]}
          alt="상품 이미지"
          className="h-full w-full object-contain"
        />
      </div>

      {/* 썸네일 목록 */}
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
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
      <h2 className="mb-8 text-[18px] font-black tracking-tight text-ink">상품 상세 설명</h2>
      <div className="space-y-6 text-[14px] leading-relaxed text-ink">
        {blocks.map((block, i) => {
          if (block.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap text-ink-sub">
                {block.content}
              </p>
            );
          }
          return (
            <figure key={i} className="mx-auto max-w-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.caption || "상품 이미지"}
                className="w-full rounded border border-line object-contain"
              />
              {block.caption && (
                <figcaption className="mt-2 text-center text-[12px] text-ink-sub">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
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

  // 클라이언트 즉시 계산: basePrice + 선택 옵션 priceDelta 합산
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

  // 표시할 단가·합계: 단가표 API 결과 우선, 없으면 클라이언트 계산 사용
  const displayUnitPrice = quote?.unitPrice ?? (localUnitPrice > 0 ? localUnitPrice : null);
  const displaySubtotal = quote?.subtotal ?? (localUnitPrice > 0 ? localUnitPrice * quantity : null);

  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setQuoteErr(null);
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
          setQuote(null);
          setQuoteErr(data.error ?? "가격 계산 실패");
        } else {
          setQuote(data);
          setQuoteErr(null);
        }
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        setQuote(null);
        setQuoteErr("네트워크 오류");
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
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
      subtotal: totalWithVat,   // 장바구니에는 VAT 포함 합계 저장
      vatAmount,
    });
    router.push("/cart");
  }

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* 좌측: 이미지 갤러리 */}
        <ImageGallery images={product.images} />

        {/* 우측: 옵션 + 가격 */}
        <div>
          <Link
            href={`/products?cat=${CATEGORY_PARAMS[product.category]}`}
            className="mb-2 inline-block text-[12px] font-medium text-brand hover:underline"
          >
            {CATEGORY_LABELS[product.category]}
          </Link>
          <h1 className="mb-3 text-[24px] font-black tracking-tight text-ink">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-[13px] leading-relaxed text-ink-sub">
              {product.description}
            </p>
          )}
          {product.basePrice > 0 && (
            <p className="mt-3 text-[22px] font-black tracking-tight text-ink">
              {product.basePrice.toLocaleString()}원
            </p>
          )}

          {product.optionGroups.length > 0 && (
            <>
              <div className="my-6 border-t border-line" />
              {product.optionGroups.map((g) => (
                <div key={g.id} className="mb-5">
                  <label className="mb-2 block text-[13px] font-bold text-ink">
                    {g.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {g.values.map((v) => {
                      const selected = options[g.name] === v.label;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setOptions((o) => ({ ...o, [g.name]: v.label }))}
                          className={`rounded-sm border px-3 py-2 text-left text-[13px] transition-colors ${
                            selected
                              ? "border-brand bg-brand-light font-bold text-brand"
                              : "border-line text-ink hover:border-ink"
                          }`}
                        >
                          <span>{v.label}</span>
                          {v.priceDelta > 0 && (
                            <span className={`ml-1.5 text-[12px] ${selected ? "text-brand" : "text-ink-sub"}`}>
                              +{v.priceDelta.toLocaleString()}원
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {isPaper && (
            <div className="mb-5">
              <label className="mb-2 block text-[13px] font-bold text-ink">페이지 수</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={pageCount}
                onChange={(e) => setPageCount(Math.max(1, Number(e.target.value) || 0))}
                className="w-32 rounded-sm border border-line px-3 py-2 text-[14px] outline-none focus:border-brand"
              />
              <p className="mt-1.5 text-[12px] text-ink-sub">
                50쪽 이하 / 51~100쪽 / 101쪽 이상 구간으로 단가 적용
              </p>
            </div>
          )}

          {/* 가격 영역: 기본단가 → 옵션 → 수량 → 합계 */}
          <div className="mt-6 overflow-hidden rounded border border-line">

            {/* 선택된 옵션별 단가 */}
            {product.optionGroups.map((g) => {
              const selectedLabel = options[g.name];
              if (!selectedLabel) return null;
              const val = g.values.find((v) => v.label === selectedLabel);
              return (
                <div key={g.id} className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="text-[13px] text-ink-sub">
                    {g.name}
                    <span className="ml-1.5 font-medium text-ink">{selectedLabel}</span>
                  </span>
                  <span className="text-[13px] text-ink-sub">
                    {val && val.priceDelta > 0
                      ? `+${val.priceDelta.toLocaleString()}원`
                      : "—"}
                  </span>
                </div>
              );
            })}

            {/* 수량 */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[13px] text-ink-sub">수량</span>
              <div className="flex items-stretch overflow-hidden rounded-sm border border-line">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-[14px] text-ink hover:bg-bg"
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
                  className="w-16 border-0 bg-transparent text-center text-[14px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 text-[14px] text-ink hover:bg-bg"
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
            </div>

            {/* 공급가 + 부가세 + 합계 */}
            <div className="bg-bg px-4 py-4">
              {quoteErr && !displaySubtotal ? (
                <p className="text-[13px] font-medium text-brand">{quoteErr}</p>
              ) : displaySubtotal ? (
                <div className="space-y-2">
                  {/* 공급가 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink-sub">공급가</span>
                    <span className="text-[13px] text-ink">
                      {displaySubtotal.toLocaleString()}원
                    </span>
                  </div>
                  {/* 부가세 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink-sub">부가세 (VAT 10%)</span>
                    <span className="text-[13px] text-ink">
                      {Math.round(displaySubtotal * 0.1).toLocaleString()}원
                    </span>
                  </div>
                  {/* 구분선 */}
                  <div className="border-t border-line pt-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-bold text-ink">합계 (VAT 포함)</span>
                      <span className="text-[24px] font-black tracking-tight text-brand">
                        {Math.round(displaySubtotal * 1.1).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              ) : loading ? (
                <p className="text-[13px] text-ink-sub">계산 중…</p>
              ) : (
                <p className="text-[13px] text-ink-sub">단가가 설정되지 않았습니다.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!displaySubtotal}
            className="mt-5 w-full rounded-sm bg-brand py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
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
