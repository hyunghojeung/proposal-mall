// 가격 견적 엔진
// 상품 카테고리에 따라 적절한 단가표(paper / binding / box)에서 단가를 lookup
// 옵션 선택값 → variant / paper type 매핑 → DB query → 단가 × 수량 = 합계

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

export async function calculateQuote(input: QuoteInput): Promise<QuoteResult> {
  const { product, options, quantity } = input;
  const tier = quantityTier(quantity);

  if (product.category === ProductCategory.PAPER_INNER) {
    const paperLabel = options["용지"];
    const paper = paperLabel ? PAPER_LABEL_TO_ENUM[paperLabel] : null;
    if (!paper) throw new Error("용지를 선택해 주세요");
    const pageCount = input.pageCount ?? 0;
    if (pageCount <= 0) throw new Error("페이지 수를 입력해 주세요");
    // 시드는 50/100/200 만 제공 — 가장 가까운 큰 구간으로 매핑
    const bucket = pageCount <= 50 ? 50 : pageCount <= 100 ? 100 : 200;
    const row = await prisma.pricePaper.findUnique({
      where: { paper_qtyTier_pageCount: { paper, qtyTier: tier, pageCount: bucket } },
    });
    if (!row) throw new Error("해당 옵션의 단가가 등록되어 있지 않습니다");
    return {
      unitPrice: row.unitPrice,
      subtotal: row.unitPrice * quantity,
      qtyTier: tier,
      breakdown: `${paperLabel} · ${pageCount}쪽 (${bucket}쪽 구간) · ${tier}부 구간`,
    };
  }

  if (
    product.category === ProductCategory.BINDING_3_RING ||
    product.category === ProductCategory.BINDING_PT ||
    product.category === ProductCategory.BINDING_HARDCOVER
  ) {
    const variant = options["형태"]; // "인쇄형" | "원단형"
    if (!variant) throw new Error("형태(인쇄형/원단형)를 선택해 주세요");
    const binding =
      variant === "인쇄형" ? BindingType.PRINTED : BindingType.FABRIC;
    let row = await prisma.priceBinding.findUnique({
      where: {
        binding_qtyTier_variant: { binding, qtyTier: tier, variant },
      },
    });
    // 인쇄형 라벨도 PRINTED 단가표에 있으니 fallback 시 binding 매핑을 한 번 더 시도
    if (!row && binding === BindingType.FABRIC) {
      row = await prisma.priceBinding.findUnique({
        where: {
          binding_qtyTier_variant: {
            binding: BindingType.PRINTED,
            qtyTier: tier,
            variant,
          },
        },
      });
    }
    if (!row) throw new Error("해당 옵션의 단가가 등록되어 있지 않습니다");
    return {
      unitPrice: row.unitPrice,
      subtotal: row.unitPrice * quantity,
      qtyTier: tier,
      breakdown: `${variant} · ${tier}부 구간`,
    };
  }

  if (
    product.category === ProductCategory.CARRIER_BOX ||
    product.category === ProductCategory.MAGNETIC_BOX
  ) {
    const size = options["사이즈"];
    if (!size) throw new Error("사이즈를 선택해 주세요");
    const row = await prisma.priceBox.findUnique({
      where: {
        category_qtyTier_variant: {
          category: product.category,
          qtyTier: tier,
          variant: size,
        },
      },
    });
    if (!row) throw new Error("해당 옵션의 단가가 등록되어 있지 않습니다");
    return {
      unitPrice: row.unitPrice,
      subtotal: row.unitPrice * quantity,
      qtyTier: tier,
      breakdown: `${size} · ${tier}개 구간`,
    };
  }

  throw new Error(`지원하지 않는 카테고리: ${product.category}`);
}
