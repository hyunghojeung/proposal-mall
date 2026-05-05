// 가격 견적 엔진
// 1순위: 카테고리별 단가표(price_paper / price_binding / price_box) 조회
// 2순위: 단가표 미등록 시 상품 기본단가(basePrice) + 옵션 추가단가(priceDelta) 합산

import {
  type Product,
  type OptionGroup,
  type OptionValue,
  PaperType,
  BindingType,
  ProductCategory,
} from "@prisma/client";
import { prisma } from "./prisma";
import { quantityTier } from "./pricing";

export type ProductWithOptions = Product & {
  optionGroups: (OptionGroup & { values: OptionValue[] })[];
};

export type SelectedOptions = Record<string, string>;

export interface QuoteInput {
  product: ProductWithOptions;
  options: SelectedOptions;
  quantity: number;
  pageCount?: number;
}

export interface QuoteResult {
  unitPrice: number;
  subtotal: number;
  qtyTier: string;
  breakdown: string;
}

const PAPER_LABEL_TO_ENUM: Record<string, PaperType> = {
  모조지: PaperType.MOJO,
  스노우지: PaperType.SNOW,
  아트지: PaperType.ART,
  수입지: PaperType.IMPORT,
  질감용지: PaperType.TEXTURE,
};

// 기본 단가 + 선택 옵션 추가 단가 합산 (단가표 미등록 시 폴백)
function calcDirectPrice(product: ProductWithOptions, options: SelectedOptions): number {
  const base = (product as Product & { basePrice?: number }).basePrice ?? 0;
  let delta = 0;
  for (const group of product.optionGroups) {
    const selectedLabel = options[group.name];
    if (!selectedLabel) continue;
    const val = group.values.find((v) => v.label === selectedLabel);
    if (val) delta += val.priceDelta ?? 0;
  }
  return base + delta;
}

function directResult(
  product: ProductWithOptions,
  options: SelectedOptions,
  quantity: number,
  tier: string,
): QuoteResult {
  const unitPrice = calcDirectPrice(product, options);
  if (unitPrice <= 0) throw new Error("단가가 설정되지 않았습니다. 관리자 페이지에서 기본 단가를 입력해 주세요.");
  const optionDesc = Object.entries(options)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return {
    unitPrice,
    subtotal: unitPrice * quantity,
    qtyTier: tier,
    breakdown: optionDesc ? `${optionDesc} · 직접 단가 적용` : "직접 단가 적용",
  };
}

export async function calculateQuote(input: QuoteInput): Promise<QuoteResult> {
  const { product, options, quantity } = input;
  const tier = quantityTier(quantity);

  if (product.category === ProductCategory.PAPER_INNER) {
    const paperLabel = options["용지"];
    const paper = paperLabel ? PAPER_LABEL_TO_ENUM[paperLabel] : null;
    const pageCount = input.pageCount ?? 0;
    // 단가표 조회 — 용지와 페이지수가 있을 때만 시도
    if (paper && pageCount > 0) {
      const bucket = pageCount <= 50 ? 50 : pageCount <= 100 ? 100 : 200;
      const row = await prisma.pricePaper.findUnique({
        where: { paper_qtyTier_pageCount: { paper, qtyTier: tier, pageCount: bucket } },
      });
      if (row) {
        return {
          unitPrice: row.unitPrice,
          subtotal: row.unitPrice * quantity,
          qtyTier: tier,
          breakdown: `${paperLabel} · ${pageCount}쪽 (${bucket}쪽 구간) · ${tier}부 구간`,
        };
      }
    }
    // 내지 인쇄는 페이지 수가 없으면 계산 불가
    if (pageCount <= 0) throw new Error("페이지 수를 입력해 주세요");
    return directResult(product, options, quantity, tier);
  }

  if (
    product.category === ProductCategory.BINDING_3_RING ||
    product.category === ProductCategory.BINDING_PT ||
    product.category === ProductCategory.BINDING_HARDCOVER
  ) {
    const variant = options["형태"];
    if (variant) {
      const binding = variant === "인쇄형" ? BindingType.PRINTED : BindingType.FABRIC;
      let row = await prisma.priceBinding.findUnique({
        where: { binding_qtyTier_variant: { binding, qtyTier: tier, variant } },
      });
      if (!row && binding === BindingType.FABRIC) {
        row = await prisma.priceBinding.findUnique({
          where: { binding_qtyTier_variant: { binding: BindingType.PRINTED, qtyTier: tier, variant } },
        });
      }
      if (row) {
        return {
          unitPrice: row.unitPrice,
          subtotal: row.unitPrice * quantity,
          qtyTier: tier,
          breakdown: `${variant} · ${tier}부 구간`,
        };
      }
    }
    return directResult(product, options, quantity, tier);
  }

  if (
    product.category === ProductCategory.CARRIER_BOX ||
    product.category === ProductCategory.MAGNETIC_BOX
  ) {
    const size = options["사이즈"];
    if (size) {
      const row = await prisma.priceBox.findUnique({
        where: { category_qtyTier_variant: { category: product.category, qtyTier: tier, variant: size } },
      });
      if (row) {
        return {
          unitPrice: row.unitPrice,
          subtotal: row.unitPrice * quantity,
          qtyTier: tier,
          breakdown: `${size} · ${tier}개 구간`,
        };
      }
    }
    return directResult(product, options, quantity, tier);
  }

  return directResult(product, options, quantity, tier);
}
