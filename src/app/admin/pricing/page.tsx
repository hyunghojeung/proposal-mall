import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { PricingExcelClient } from "@/components/PricingExcelClient";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "단가표 | 관리자" };
export const dynamic = "force-dynamic";

const PAPER_LABEL: Record<string, string> = {
  MOJO: "모조지",
  SNOW: "스노우지",
  ART: "아트지",
  IMPORT: "수입지",
  TEXTURE: "질감용지",
  NONE: "—",
};
const BINDING_LABEL: Record<string, string> = {
  PRINTED: "인쇄형 (PRINTED)",
  FABRIC: "원단형 (FABRIC)",
  NONE: "—",
};
const CATEGORY_LABEL: Record<string, string> = {
  CARRIER_BOX: "캐리어박스",
  MAGNETIC_BOX: "자석박스",
  BINDING_3_RING: "3공바인더",
  BINDING_PT: "PT용바인더",
  BINDING_HARDCOVER: "하드커버",
  PAPER_INNER: "내지인쇄",
};

const TIERS = ["1", "2-4", "5-9", "10+"] as const;

export default async function AdminPricingPage() {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const [paper, binding, box] = await Promise.all([
    prisma.pricePaper
      .findMany({
        orderBy: [{ paper: "asc" }, { pageCount: "asc" }, { qtyTier: "asc" }],
      })
      .catch(() => []),
    prisma.priceBinding
      .findMany({
        orderBy: [{ binding: "asc" }, { variant: "asc" }, { qtyTier: "asc" }],
      })
      .catch(() => []),
    prisma.priceBox
      .findMany({
        orderBy: [{ category: "asc" }, { variant: "asc" }, { qtyTier: "asc" }],
      })
      .catch(() => []),
  ]);

  return (
    <AdminShell active="pricing" title="단가표 관리">
      <p className="mb-5 text-[13px] text-ink-sub">
        엑셀로 한 번에 편집 → 다시 업로드. 업로드 시 해당 테이블이 통째로 교체되므로 항상 최신 다운로드본을 기준으로 수정해 주세요.
      </p>

      <PricingExcelClient />

      <section className="mt-10">
        <h2 className="text-[16px] font-bold text-ink">현재 적용 중인 단가</h2>

        <h3 className="mt-6 text-[14px] font-bold text-ink">내지 ({paper.length}행)</h3>
        <PricingTable
          headers={["용지", "수량구간", "페이지수", "단가"]}
          rows={paper.map((r) => [
            PAPER_LABEL[r.paper] ?? r.paper,
            r.qtyTier,
            `${r.pageCount}쪽`,
            `${r.unitPrice.toLocaleString()}원`,
          ])}
        />

        <h3 className="mt-7 text-[14px] font-bold text-ink">제본 ({binding.length}행)</h3>
        <PricingTable
          headers={["제본", "수량구간", "옵션", "단가"]}
          rows={binding.map((r) => [
            BINDING_LABEL[r.binding] ?? r.binding,
            r.qtyTier,
            r.variant,
            `${r.unitPrice.toLocaleString()}원`,
          ])}
        />

        <h3 className="mt-7 text-[14px] font-bold text-ink">박스 ({box.length}행)</h3>
        <PricingTable
          headers={["카테고리", "수량구간", "옵션", "단가"]}
          rows={box.map((r) => [
            CATEGORY_LABEL[r.category] ?? r.category,
            r.qtyTier,
            r.variant,
            `${r.unitPrice.toLocaleString()}원`,
          ])}
        />

        <p className="mt-6 text-[12px] text-ink-sub">
          수량 구간은 항상 {TIERS.join(" / ")} 4종입니다. 엑셀에 다른 값이 있으면 업로드가 거부됩니다.
        </p>
      </section>
    </AdminShell>
  );
}

function PricingTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-2 rounded border border-line bg-bg px-3 py-6 text-center text-[13px] text-ink-sub">
        데이터가 없습니다.
      </p>
    );
  }
  return (
    <div className="mt-2 overflow-x-auto rounded border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-bg text-left text-[12px] text-ink-sub">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2 ${j === r.length - 1 ? "text-right font-medium text-ink" : "text-ink-sub"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
