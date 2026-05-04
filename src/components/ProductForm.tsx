"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";

export interface ProductFormValue {
  id?: number;
  slug: string;
  name: string;
  category: ProductCategory;
  binding: BindingType;
  paper: PaperType;
  description: string;
  thumbnail: string;
  sortOrder: number;
  isActive: boolean;
  optionGroups: {
    name: string;
    required: boolean;
    sortOrder: number;
    values: { label: string; priceDelta: number; sortOrder: number }[];
  }[];
}

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "CARRIER_BOX", label: "제안서캐리어박스" },
  { value: "MAGNETIC_BOX", label: "자석박스" },
  { value: "BINDING_3_RING", label: "3공바인더" },
  { value: "BINDING_PT", label: "PT용바인더" },
  { value: "BINDING_HARDCOVER", label: "하드커버스프링제본" },
  { value: "PAPER_INNER", label: "내지인쇄" },
];
const BINDING_OPTIONS: { value: BindingType; label: string }[] = [
  { value: "NONE", label: "—" },
  { value: "PRINTED", label: "인쇄형" },
  { value: "FABRIC", label: "원단형" },
];
const PAPER_OPTIONS: { value: PaperType; label: string }[] = [
  { value: "NONE", label: "—" },
  { value: "MOJO", label: "모조지" },
  { value: "SNOW", label: "스노우지" },
  { value: "ART", label: "아트지" },
  { value: "IMPORT", label: "수입지" },
  { value: "TEXTURE", label: "질감용지" },
];

export function ProductForm({
  initial,
  mode,
}: {
  initial: ProductFormValue;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValue>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) {
    setV({ ...v, [key]: value });
  }

  function setGroup(idx: number, patch: Partial<ProductFormValue["optionGroups"][number]>) {
    const next = [...v.optionGroups];
    next[idx] = { ...next[idx], ...patch };
    setV({ ...v, optionGroups: next });
  }

  function addGroup() {
    setV({
      ...v,
      optionGroups: [
        ...v.optionGroups,
        { name: "", required: true, sortOrder: v.optionGroups.length, values: [] },
      ],
    });
  }

  function removeGroup(idx: number) {
    setV({ ...v, optionGroups: v.optionGroups.filter((_, i) => i !== idx) });
  }

  function setValue(gIdx: number, vIdx: number, patch: Partial<{ label: string; priceDelta: number; sortOrder: number }>) {
    const next = [...v.optionGroups];
    const values = [...next[gIdx].values];
    values[vIdx] = { ...values[vIdx], ...patch };
    next[gIdx] = { ...next[gIdx], values };
    setV({ ...v, optionGroups: next });
  }

  function addValue(gIdx: number) {
    const next = [...v.optionGroups];
    next[gIdx] = {
      ...next[gIdx],
      values: [
        ...next[gIdx].values,
        { label: "", priceDelta: 0, sortOrder: next[gIdx].values.length },
      ],
    };
    setV({ ...v, optionGroups: next });
  }

  function removeValue(gIdx: number, vIdx: number) {
    const next = [...v.optionGroups];
    next[gIdx] = {
      ...next[gIdx],
      values: next[gIdx].values.filter((_, i) => i !== vIdx),
    };
    setV({ ...v, optionGroups: next });
  }

  function submit() {
    setErr(null);
    start(async () => {
      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${v.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const payload = {
        ...v,
        thumbnail: v.thumbnail || undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(data?.error ?? "저장 실패");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-line p-5">
        <h2 className="mb-4 text-[14px] font-bold text-ink">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="slug (URL용 ID)">
            <input
              value={v.slug}
              onChange={(e) => set("slug", e.target.value)}
              disabled={mode === "edit"}
              placeholder="binding-3-ring"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:bg-bg"
            />
          </Field>
          <Field label="상품명">
            <input
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="카테고리">
            <select
              value={v.category}
              onChange={(e) => set("category", e.target.value as ProductCategory)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="제본 형태 (해당 시)">
            <select
              value={v.binding}
              onChange={(e) => set("binding", e.target.value as BindingType)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {BINDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="기본 용지 (내지 카테고리 시)">
            <select
              value={v.paper}
              onChange={(e) => set("paper", e.target.value as PaperType)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {PAPER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="정렬 순서">
            <input
              type="number"
              value={v.sortOrder}
              onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="썸네일 URL (선택)" className="sm:col-span-2">
            <input
              value={v.thumbnail}
              onChange={(e) => set("thumbnail", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="설명" className="sm:col-span-2">
            <textarea
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="accent-[#E8481A]"
          />
          사이트에 노출
        </label>
      </section>

      <section className="rounded border border-line p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-ink">옵션 그룹</h2>
          <button
            type="button"
            onClick={addGroup}
            className="rounded-sm border border-line px-3 py-1 text-[12px] hover:border-ink"
          >
            + 그룹 추가
          </button>
        </div>

        {v.optionGroups.length === 0 ? (
          <p className="rounded border border-dashed border-line bg-bg px-4 py-8 text-center text-[12px] text-ink-sub">
            옵션 그룹이 없습니다. 박스/제본은 사이즈·형태가 옵션, 내지는 용지가 옵션입니다.
          </p>
        ) : (
          <div className="space-y-4">
            {v.optionGroups.map((g, gi) => (
              <div key={gi} className="rounded border border-line p-3">
                <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                  <Field label={`그룹 #${gi + 1} 이름`}>
                    <input
                      value={g.name}
                      onChange={(e) => setGroup(gi, { name: e.target.value })}
                      placeholder="형태 / 사이즈 / 용지"
                      className="w-full rounded-sm border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                    />
                  </Field>
                  <Field label="정렬">
                    <input
                      type="number"
                      value={g.sortOrder}
                      onChange={(e) => setGroup(gi, { sortOrder: Number(e.target.value) || 0 })}
                      className="w-full rounded-sm border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="rounded-sm border border-line px-2.5 py-1.5 text-[12px] text-brand hover:border-brand"
                  >
                    그룹 삭제
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {g.values.map((val, vi) => (
                    <div key={vi} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-center">
                      <input
                        value={val.label}
                        onChange={(e) => setValue(gi, vi, { label: e.target.value })}
                        placeholder="라벨 (예: A4, 인쇄형)"
                        className="rounded-sm border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        value={val.priceDelta}
                        onChange={(e) =>
                          setValue(gi, vi, { priceDelta: Number(e.target.value) || 0 })
                        }
                        placeholder="가격 가산 (원)"
                        className="rounded-sm border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeValue(gi, vi)}
                        className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-brand hover:border-brand"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addValue(gi)}
                    className="rounded-sm border border-dashed border-line px-3 py-1 text-[12px] text-ink-sub hover:border-ink hover:text-ink"
                  >
                    + 값 추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {err && <p className="text-[13px] font-medium text-brand">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !v.slug || !v.name}
          onClick={submit}
          className="rounded-sm bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "create" ? "상품 등록" : "변경 사항 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          disabled={pending}
          className="rounded-sm border border-line px-5 py-2.5 text-[14px] hover:border-ink"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[12px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
