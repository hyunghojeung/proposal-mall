"use client";

import { useState, useRef } from "react";

interface DiagramItem {
  id: number;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  downloadCount: number;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  initialDiagrams: DiagramItem[];
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  fileUrl: "",
  fileName: "",
  fileSize: "",
  sortOrder: 0,
  isActive: true,
};

// ── 파일 업로더 ──────────────────────────────────────────────────
function FileUploader({
  value,
  fileName,
  fileSize,
  onChange,
}: {
  value: string;
  fileName: string;
  fileSize: string;
  onChange: (url: string, name: string, size: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-diagram", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; fileName?: string; fileSize?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "업로드 실패");
      onChange(data.url, data.fileName ?? file.name, data.fileSize ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded border border-[#3a3e54] bg-[#131626] px-4 py-2 text-[13px] text-[#9095b8] transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {uploading ? "업로드 중…" : "파일 선택"}
        </button>
        {fileName && (
          <span className="flex items-center gap-1.5 text-[13px] text-[#9095b8]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {fileName}
            {fileSize && <span className="text-[#6b7090]">({fileSize})</span>}
          </span>
        )}
      </div>
      {value && (
        <p className="mt-1 break-all text-[11px] text-[#6b7090]">{value}</p>
      )}
      {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export function DiagramAdminClient({ initialDiagrams }: Props) {
  const [diagrams, setDiagrams] = useState<DiagramItem[]>(initialDiagrams);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(d: DiagramItem) {
    setForm({
      title: d.title,
      description: d.description,
      category: d.category,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    });
    setEditId(d.id);
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("제목을 입력하세요."); return; }
    if (!form.fileUrl.trim()) { setError("파일을 업로드하세요."); return; }
    if (!form.fileName.trim()) { setError("파일명을 입력하세요."); return; }
    setSaving(true);
    setError(null);

    try {
      if (editId !== null) {
        const res = await fetch(`/api/diagrams/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = (await res.json()) as { diagram?: DiagramItem; error?: string };
        if (!res.ok) throw new Error(data.error ?? "수정 실패");
        setDiagrams((prev) => prev.map((d) => d.id === editId ? { ...d, ...form } : d));
      } else {
        const res = await fetch("/api/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = (await res.json()) as { diagram?: DiagramItem; error?: string };
        if (!res.ok) throw new Error(data.error ?? "등록 실패");
        if (data.diagram) setDiagrams((prev) => [data.diagram!, ...prev]);
      }
      setShowForm(false);
      setEditId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/diagrams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleteId(null);
  }

  async function toggleActive(d: DiagramItem) {
    const res = await fetch(`/api/diagrams/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    if (res.ok) {
      setDiagrams((prev) => prev.map((x) => x.id === d.id ? { ...x, isActive: !d.isActive } : x));
    }
  }

  return (
    <div>
      {/* ── 상단 헤더 ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[15px] text-[#9095b8]">
          전개도 파일을 등록하면 고객문의 페이지에서 다운로드할 수 있습니다.
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          전개도 추가
        </button>
      </div>

      {/* ── 추가/수정 폼 ── */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[#3a3e54] bg-[#131626] p-6">
          <h2 className="mb-5 text-[17px] font-bold text-white">
            {editId !== null ? "전개도 수정" : "새 전개도 추가"}
          </h2>

          {/* 제목 */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예: A4 제안서캐리어박스 전개도"
              className="w-full rounded border border-[#3a3e54] bg-[#1e2235] px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand"
            />
          </div>

          {/* 카테고리 + 순서 */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">카테고리</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="예: 캐리어박스"
                className="w-full rounded border border-[#3a3e54] bg-[#1e2235] px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">정렬 순서</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full rounded border border-[#3a3e54] bg-[#1e2235] px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* 설명 */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="파일에 대한 간단한 설명을 입력하세요"
              className="w-full resize-y rounded border border-[#3a3e54] bg-[#1e2235] px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand"
            />
          </div>

          {/* 파일 업로드 */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">파일 업로드 (Dropbox) *</label>
            <FileUploader
              value={form.fileUrl}
              fileName={form.fileName}
              fileSize={form.fileSize}
              onChange={(url, name, size) =>
                setForm((f) => ({ ...f, fileUrl: url, fileName: name, fileSize: size }))
              }
            />
            {/* 수동 파일명 수정 */}
            {form.fileUrl && (
              <div className="mt-3">
                <label className="mb-1.5 block text-[13px] font-bold text-[#9095b8]">표시 파일명 *</label>
                <input
                  type="text"
                  value={form.fileName}
                  onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))}
                  className="w-full rounded border border-[#3a3e54] bg-[#1e2235] px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand"
                />
              </div>
            )}
          </div>

          {/* 활성 여부 */}
          <div className="mb-5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-[14px] text-[#9095b8]">게시 활성화</span>
            </label>
          </div>

          {error && <p className="mb-3 text-[13px] text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "저장 중…" : editId !== null ? "수정 완료" : "등록"}
            </button>
            <button
              onClick={cancelForm}
              className="rounded-lg border border-[#3a3e54] px-6 py-2.5 text-[14px] text-[#9095b8] hover:text-white"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 목록 ── */}
      {diagrams.length === 0 ? (
        <div className="rounded-xl border border-[#262a3d] bg-[#1e2235] px-6 py-14 text-center text-[15px] text-[#6b7090]">
          등록된 전개도가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {diagrams.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border bg-[#1e2235] p-5 transition-opacity ${
                d.isActive ? "border-[#262a3d]" : "border-[#262a3d] opacity-50"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                {/* 카테고리 뱃지 */}
                {d.category && (
                  <span className="rounded bg-brand/20 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                    {d.category}
                  </span>
                )}
                {!d.isActive && (
                  <span className="rounded bg-[#262a3d] px-2.5 py-0.5 text-[11px] font-bold text-[#6b7090]">
                    비활성
                  </span>
                )}

                {/* 제목 */}
                <h3 className="flex-1 text-[16px] font-bold text-white">{d.title}</h3>

                {/* 다운로드 수 */}
                <span className="flex items-center gap-1 text-[13px] text-[#6b7090]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {d.downloadCount}회
                </span>
              </div>

              {d.description && (
                <p className="mt-1.5 text-[13px] text-[#6b7090]">{d.description}</p>
              )}

              {/* 파일 정보 */}
              <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6b7090]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {d.fileName}
                {d.fileSize && <span>({d.fileSize})</span>}
                <span>· 순서 {d.sortOrder}</span>
              </div>

              {/* 버튼 */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openEdit(d)}
                  className="rounded border border-[#3a3e54] px-4 py-1.5 text-[13px] text-[#9095b8] hover:border-brand hover:text-brand"
                >
                  수정
                </button>
                <button
                  onClick={() => toggleActive(d)}
                  className="rounded border border-[#3a3e54] px-4 py-1.5 text-[13px] text-[#9095b8] hover:border-brand hover:text-brand"
                >
                  {d.isActive ? "비활성화" : "활성화"}
                </button>
                <button
                  onClick={() => setDeleteId(d.id)}
                  className="rounded border border-red-900/50 px-4 py-1.5 text-[13px] text-red-400 hover:border-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 삭제 확인 모달 ── */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="rounded-xl border border-[#3a3e54] bg-[#1e2235] p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[17px] font-bold text-white">전개도를 삭제하시겠습니까?</p>
            <p className="mb-6 text-[14px] text-[#9095b8]">삭제하면 복구할 수 없습니다.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-red-700"
              >
                삭제
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-[#3a3e54] px-6 py-2.5 text-[14px] text-[#9095b8] hover:text-white"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
