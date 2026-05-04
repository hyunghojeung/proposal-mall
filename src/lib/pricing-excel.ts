// 단가표 ↔ Excel 변환.
// SheetJS 의 read/write 만 사용해서 .xlsx 바이트로 직렬화/역직렬화.
// 시트명은 한국어 "단가표"; 첫 행은 헤더 (현지화).

import * as XLSX from "xlsx";
import type {
  PricePaper,
  PriceBinding,
  PriceBox,
  PaperType,
  BindingType,
  ProductCategory,
} from "@prisma/client";

export type PricingTableType = "paper" | "binding" | "box";

const HEADERS: Record<PricingTableType, string[]> = {
  paper: ["용지", "수량구간", "페이지수", "단가(원)"],
  binding: ["제본", "수량구간", "옵션", "단가(원)"],
  box: ["카테고리", "수량구간", "옵션", "단가(원)"],
};

// ── Serialize (DB → xlsx) ───────────────────
export function serializePaper(rows: PricePaper[]): Buffer {
  const data = rows.map((r) => ({
    [HEADERS.paper[0]]: r.paper,
    [HEADERS.paper[1]]: r.qtyTier,
    [HEADERS.paper[2]]: r.pageCount,
    [HEADERS.paper[3]]: r.unitPrice,
  }));
  return buildWorkbook(HEADERS.paper, data, "내지단가표");
}

export function serializeBinding(rows: PriceBinding[]): Buffer {
  const data = rows.map((r) => ({
    [HEADERS.binding[0]]: r.binding,
    [HEADERS.binding[1]]: r.qtyTier,
    [HEADERS.binding[2]]: r.variant,
    [HEADERS.binding[3]]: r.unitPrice,
  }));
  return buildWorkbook(HEADERS.binding, data, "제본단가표");
}

export function serializeBox(rows: PriceBox[]): Buffer {
  const data = rows.map((r) => ({
    [HEADERS.box[0]]: r.category,
    [HEADERS.box[1]]: r.qtyTier,
    [HEADERS.box[2]]: r.variant,
    [HEADERS.box[3]]: r.unitPrice,
  }));
  return buildWorkbook(HEADERS.box, data, "박스단가표");
}

function buildWorkbook(headers: string[], data: Record<string, unknown>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ── Parse (xlsx → 도메인 row) ───────────────
export interface ParsedPaperRow {
  paper: PaperType;
  qtyTier: string;
  pageCount: number;
  unitPrice: number;
}
export interface ParsedBindingRow {
  binding: BindingType;
  qtyTier: string;
  variant: string;
  unitPrice: number;
}
export interface ParsedBoxRow {
  category: ProductCategory;
  qtyTier: string;
  variant: string;
  unitPrice: number;
}

const VALID_TIERS = new Set(["1", "2-4", "5-9", "10+"]);

function loadSheet(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("시트가 없는 파일입니다");
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}
function asInt(v: unknown): number {
  if (typeof v === "number") return Math.trunc(v);
  const n = Number(asString(v));
  if (!Number.isFinite(n)) throw new Error(`숫자가 아님: ${v}`);
  return Math.trunc(n);
}

const PAPER_VALUES: PaperType[] = ["MOJO", "SNOW", "ART", "IMPORT", "TEXTURE", "NONE"];
const BINDING_VALUES: BindingType[] = ["PRINTED", "FABRIC", "NONE"];
const CATEGORY_VALUES: ProductCategory[] = [
  "CARRIER_BOX",
  "MAGNETIC_BOX",
  "BINDING_3_RING",
  "BINDING_PT",
  "BINDING_HARDCOVER",
  "PAPER_INNER",
];

export function parsePaper(buffer: ArrayBuffer): ParsedPaperRow[] {
  const json = loadSheet(buffer);
  return json.map((row, i) => {
    const paper = asString(row[HEADERS.paper[0]]).toUpperCase();
    const qtyTier = asString(row[HEADERS.paper[1]]);
    const pageCount = asInt(row[HEADERS.paper[2]]);
    const unitPrice = asInt(row[HEADERS.paper[3]]);
    if (!PAPER_VALUES.includes(paper as PaperType))
      throw new Error(`행 ${i + 2}: 용지 값이 잘못됨 (${paper})`);
    if (!VALID_TIERS.has(qtyTier))
      throw new Error(`행 ${i + 2}: 수량구간이 잘못됨 (${qtyTier})`);
    return { paper: paper as PaperType, qtyTier, pageCount, unitPrice };
  });
}

export function parseBinding(buffer: ArrayBuffer): ParsedBindingRow[] {
  const json = loadSheet(buffer);
  return json.map((row, i) => {
    const binding = asString(row[HEADERS.binding[0]]).toUpperCase();
    const qtyTier = asString(row[HEADERS.binding[1]]);
    const variant = asString(row[HEADERS.binding[2]]);
    const unitPrice = asInt(row[HEADERS.binding[3]]);
    if (!BINDING_VALUES.includes(binding as BindingType))
      throw new Error(`행 ${i + 2}: 제본 값이 잘못됨 (${binding})`);
    if (!VALID_TIERS.has(qtyTier))
      throw new Error(`행 ${i + 2}: 수량구간이 잘못됨 (${qtyTier})`);
    if (!variant) throw new Error(`행 ${i + 2}: 옵션이 비어있음`);
    return { binding: binding as BindingType, qtyTier, variant, unitPrice };
  });
}

export function parseBox(buffer: ArrayBuffer): ParsedBoxRow[] {
  const json = loadSheet(buffer);
  return json.map((row, i) => {
    const category = asString(row[HEADERS.box[0]]).toUpperCase();
    const qtyTier = asString(row[HEADERS.box[1]]);
    const variant = asString(row[HEADERS.box[2]]);
    const unitPrice = asInt(row[HEADERS.box[3]]);
    if (!CATEGORY_VALUES.includes(category as ProductCategory))
      throw new Error(`행 ${i + 2}: 카테고리 값이 잘못됨 (${category})`);
    if (!VALID_TIERS.has(qtyTier))
      throw new Error(`행 ${i + 2}: 수량구간이 잘못됨 (${qtyTier})`);
    if (!variant) throw new Error(`행 ${i + 2}: 옵션이 비어있음`);
    return { category: category as ProductCategory, qtyTier, variant, unitPrice };
  });
}
