"use client";

import { useState } from "react";

const ENUM_OPTIONS = [
  { key: "CARRIER_BOX",      slug: "carrier-box",      label: "제안서캐리어박스" },
  { key: "MAGNETIC_BOX",     slug: "magnetic-box",     label: "자석박스" },
  { key: "BINDING_3_RING",   slug: "binding-3-ring",   label: "3공바인더" },
  { key: "BINDING_PT",       slug: "binding-pt",       label: "PT용바인더" },
  { key: "BINDING_HARDCOVER",slug: "binding-hardcover",label: "하드커버스프링제본" },
  { key: "PAPER_INNER",      slug: "paper-inner",      label: "내지 인쇄" },
];

export interface CategoryRow {
  id: number;
  enumKey: string;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export function CategoryAdminClient({ initial }: { initial: CategoryRow[] }) {
  const [rows, setRows]         = useState<CategoryRow[]>(initial);
  const [editing, setEditing]   = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const usedEnumKeys = rows.map((r) => r.enumKey);
  const availableEnums = ENUM_OPTIONS.filter(
    (o) => !usedEnumKeys.includes(o.key) || o.key === editing?.enumKey,
  );

  /* ── 저장 (신규/수정) ── */
  async function handleSave(form: Omit<CategoryRow, "id" | "isActive">) {
    setSaving(true); setErr(null);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/categories/${editing.id}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: form.label, description: form.description, sortOrder: form.sortOrder }),
        });
        if (!res.ok) { const d = await res.json(); setErr(d.error ?? "저장 실패"); return; }
        const updated = await res.json() as CategoryRow;
        setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        setEditing(null);
      } else {
        const res = await fetch("/api/admin/categories", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, isActive: true }),
        });
        if (!res.ok) { const d = await res.json(); setErr(d.error ?? "등록 실패"); return; }
        const created = await res.json() as CategoryRow;
        setRows((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        setCreating(false);
      }
    } finally { setSaving(false); }
  }

  /* ── 활성/비활성 토글 ── */
  async function toggleActive(row: CategoryRow) {
    const res = await fetch(`/api/admin/categories/${row.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    if (!res.ok) return;
    const updated = await res.json() as CategoryRow;
    setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }

  /* ── 삭제 ── */
  async function handleDelete(id: number) {
    if (!confirm("이 카테고리를 삭제하시겠습니까?\n해당 카테고리 상품은 카테고리 미지정 상태가 됩니다.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">

      {/* 안내 */}
      <div className="rounded border border-[#2e2e33] bg-[#18181b] px-5 py-3 text-[14px] text-[#a0a0a8]">
        카테고리는 현재 6개 상품 유형(캐리어박스·자석박스·제본 3종·내지인쇄)을 관리합니다.
        표시명·설명·노출 순서를 자유롭게 수정하세요.
      </div>

      {/* 등록 버튼 */}
      {availableEnums.length > 0 && (
        <button onClick={() => { setCreating(true); setEditing(null); setErr(null); }}
          className="rounded bg-brand px-5 py-2 text-[15px] font-bold text-white hover:bg-brand-dark">
          + 카테고리 등록
        </button>
      )}

      {/* 신규 등록 폼 */}
      {creating && (
        <CategoryForm
          enumOptions={availableEnums}
          saving={saving}
          err={err}
          onSave={handleSave}
          onCancel={() => { setCreating(false); setErr(null); }}
        />
      )}

      {/* 목록 */}
      <div className="overflow-x-auto rounded border border-[#2e2e33]">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="border-b border-[#2e2e33] bg-[#18181b] text-[13px] text-[#a0a0a8]">
              <th className="px-4 py-3 text-left font-semibold">순서</th>
              <th className="px-4 py-3 text-left font-semibold">표시명</th>
              <th className="px-4 py-3 text-left font-semibold">설명</th>
              <th className="px-4 py-3 text-left font-semibold">slug</th>
              <th className="px-4 py-3 text-left font-semibold">노출</th>
              <th className="px-4 py-3 text-left font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#2e2e33]">
                <td className="px-4 py-3 text-[#a0a0a8]">{row.sortOrder}</td>
                <td className="px-4 py-3 font-bold text-white">{row.label}</td>
                <td className="px-4 py-3 max-w-[260px] truncate text-[#a0a0a8]">{row.description || "-"}</td>
                <td className="px-4 py-3 font-mono text-[13px] text-[#6b6b73]">{row.slug}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(row)}
                    className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${
                      row.isActive
                        ? "bg-green-900/40 text-green-400"
                        : "bg-gray-800 text-[#6b6b73]"
                    }`}>
                    {row.isActive ? "노출" : "숨김"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(row); setCreating(false); setErr(null); }}
                      className="rounded border border-[#3a3a40] px-3 py-1 text-[13px] text-[#a0a0a8] hover:border-brand hover:text-brand">
                      수정
                    </button>
                    <button onClick={() => handleDelete(row.id)}
                      className="rounded border border-[#3a3a40] px-3 py-1 text-[13px] text-brand hover:border-brand">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[15px] text-[#6b6b73]">
                등록된 카테고리가 없습니다
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 수정 폼 */}
      {editing && (
        <div className="rounded border border-[#2e2e33] bg-[#18181b] p-5">
          <h3 className="mb-4 text-[16px] font-bold text-white">카테고리 수정 — {editing.label}</h3>
          <CategoryEditForm
            row={editing}
            saving={saving}
            err={err}
            onSave={(data) => handleSave({ ...data, enumKey: editing.enumKey, slug: editing.slug })}
            onCancel={() => { setEditing(null); setErr(null); }}
          />
        </div>
      )}
    </div>
  );
}

/* ── 신규 등록 폼 ── */
function CategoryForm({
  enumOptions, saving, err, onSave, onCancel,
}: {
  enumOptions: { key: string; slug: string; label: string }[];
  saving: boolean; err: string | null;
  onSave: (data: Omit<CategoryRow, "id" | "isActive">) => void;
  onCancel: () => void;
}) {
  const [enumKey, setEnumKey] = useState(enumOptions[0]?.key ?? "");
  const selected = enumOptions.find((o) => o.key === enumKey);
  const [label, setLabel]     = useState(selected?.label ?? "");
  const [desc,  setDesc]      = useState("");
  const [order, setOrder]     = useState(0);

  function handleEnumChange(key: string) {
    setEnumKey(key);
    const opt = enumOptions.find((o) => o.key === key);
    if (opt) setLabel(opt.label);
  }

  return (
    <div className="rounded border border-brand/40 bg-[#18181b] p-5 space-y-3">
      <h3 className="text-[16px] font-bold text-white">새 카테고리 등록</h3>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">카테고리 유형 (상품 연결 기준)</span>
        <select value={enumKey} onChange={(e) => handleEnumChange(e.target.value)}
          className="w-full rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[15px] text-white outline-none focus:border-brand">
          {enumOptions.map((o) => <option key={o.key} value={o.key}>{o.label} ({o.slug})</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">표시명</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[15px] text-white outline-none focus:border-brand" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">설명 (홈페이지 카드)</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
          className="w-full rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[14px] text-white outline-none focus:border-brand" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">노출 순서</span>
        <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)}
          className="w-28 rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[15px] text-white outline-none focus:border-brand" />
      </label>
      {err && <p className="text-[14px] text-brand">{err}</p>}
      <div className="flex gap-2">
        <button disabled={saving || !label} onClick={() => onSave({ enumKey, slug: selected?.slug ?? "", label, description: desc, sortOrder: order })}
          className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
          {saving ? "저장 중…" : "등록"}
        </button>
        <button onClick={onCancel}
          className="rounded border border-[#3a3a40] px-4 py-2 text-[14px] text-[#a0a0a8] hover:border-white">
          취소
        </button>
      </div>
    </div>
  );
}

/* ── 수정 폼 ── */
function CategoryEditForm({
  row, saving, err, onSave, onCancel,
}: {
  row: CategoryRow; saving: boolean; err: string | null;
  onSave: (data: { label: string; description: string; sortOrder: number }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [desc,  setDesc]  = useState(row.description);
  const [order, setOrder] = useState(row.sortOrder);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">표시명</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[15px] text-white outline-none focus:border-brand" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">설명 (홈페이지 카드)</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
          className="w-full rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[14px] text-white outline-none focus:border-brand" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-bold text-[#a0a0a8]">노출 순서</span>
        <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)}
          className="w-28 rounded border border-[#3a3a40] bg-[#2a2a2e] px-3 py-2 text-[15px] text-white outline-none focus:border-brand" />
      </label>
      {err && <p className="text-[14px] text-brand">{err}</p>}
      <div className="flex gap-2">
        <button disabled={saving || !label} onClick={() => onSave({ label, description: desc, sortOrder: order })}
          className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
        <button onClick={onCancel}
          className="rounded border border-[#3a3a40] px-4 py-2 text-[14px] text-[#a0a0a8] hover:border-white">
          취소
        </button>
      </div>
    </div>
  );
}
