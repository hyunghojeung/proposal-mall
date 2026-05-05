"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string };

export interface ProductFormValue {
  id?: number;
  slug: string;
  name: string;
  category: ProductCategory;
  binding: BindingType;
  paper: PaperType;
  description: string;
  thumbnail: string;
  images: string[];
  contentBlocks: ContentBlock[];
  basePrice: number;
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

// ── 공통 파일 업로드 유틸 ─────────────────────────────────────
async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(d?.error ?? "업로드 실패");
  }
  const d = (await res.json()) as { url: string };
  return d.url;
}

// ── 이미지 업로드 훅 (단일) ───────────────────────────────────
function useImageUpload(onDone: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function triggerPick() {
    setUploadErr(null);
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadErr(null);
    try {
      const url = await uploadFile(file);
      onDone(url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  return { uploading, uploadErr, inputRef, triggerPick, handleChange };
}

// ── 이미지 갤러리 섹션 ───────────────────────────────────────
function ImageGallery({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [draggingOver, setDraggingOver] = useState(false);
  const upload = useImageUpload((url) => onChange([...images, url]));

  function setRepresentative(i: number) {
    if (i === 0) return;
    const next = [...images];
    const [picked] = next.splice(i, 1);
    next.unshift(picked);
    onChange(next);
  }

  function removeImage(i: number) {
    onChange(images.filter((_, j) => j !== i));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (images.length < 5) setDraggingOver(true);
  }

  function handleDragLeave() {
    setDraggingOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDraggingOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
    );
    const available = 5 - images.length;
    const newUrls: string[] = [];
    for (const file of files.slice(0, available)) {
      try {
        newUrls.push(await uploadFile(file));
      } catch { /* 개별 실패 무시 */ }
    }
    if (newUrls.length > 0) onChange([...images, ...newUrls]);
  }

  return (
    <div>
      {/* 드래그앤드롭 존 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-3 flex min-h-[60px] flex-wrap gap-3 rounded border-2 border-dashed p-3 transition-colors ${
          draggingOver ? "border-brand bg-brand-light" : "border-line"
        }`}
      >
        {images.length === 0 && !draggingOver && (
          <p className="flex w-full items-center justify-center text-[12px] text-ink-sub">
            이미지를 여기에 드래그하거나 아래 버튼으로 추가하세요
          </p>
        )}
        {draggingOver && (
          <p className="flex w-full items-center justify-center text-[12px] font-bold text-brand">
            여기에 놓으세요
          </p>
        )}

        {images.map((url, i) => (
          <div key={url} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`상품 이미지 ${i + 1}`}
              className={`h-24 w-24 rounded-sm object-cover transition-all ${
                i === 0 ? "border-2 border-brand" : "border border-line"
              }`}
            />
            {/* 대표 뱃지 */}
            {i === 0 && (
              <span className="absolute left-0 top-0 rounded-br-sm rounded-tl-sm bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                대표
              </span>
            )}
            {/* 호버 오버레이 */}
            <div className="absolute inset-0 hidden rounded-sm bg-black/50 group-hover:flex flex-col items-center justify-center gap-1">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setRepresentative(i)}
                  className="rounded bg-brand px-2 py-0.5 text-[10px] font-bold text-white hover:bg-brand-dark"
                >
                  대표 설정
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="rounded bg-black/70 px-2 py-0.5 text-[10px] text-white hover:bg-black"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {images.length < 5 && (
          <button
            type="button"
            onClick={upload.triggerPick}
            disabled={upload.uploading}
            className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-sub hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {upload.uploading ? (
              "업로드 중…"
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 16V8m0 0-3 3m3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                </svg>
                이미지 추가 ({images.length}/5)
              </>
            )}
          </button>
        )}
        {upload.uploadErr && (
          <p className="text-[12px] text-brand">{upload.uploadErr}</p>
        )}
      </div>

      <input
        ref={upload.inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={upload.handleChange}
      />
      <p className="mt-2 text-[11px] text-ink-sub">
        최대 5장 · JPG/PNG/WEBP · 10MB 이하 · 이미지 위에 커서를 올리면 대표 설정 / 삭제 버튼이 나타납니다
      </p>
    </div>
  );
}

// ── 콘텐츠 블록 에디터 ───────────────────────────────────────
function ContentBlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (b: ContentBlock[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImages(files: File[]) {
    const imageFiles = files.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)
    );
    if (imageFiles.length === 0) return;
    setUploading(true);
    setUploadErr(null);
    const newBlocks: ContentBlock[] = [];
    for (const file of imageFiles) {
      try {
        const url = await uploadFile(file);
        newBlocks.push({ type: "image", url, caption: "" });
      } catch (err) {
        setUploadErr(err instanceof Error ? err.message : "업로드 실패");
      }
    }
    if (newBlocks.length > 0) onChange([...blocks, ...newBlocks]);
    setUploading(false);
  }

  function updateBlock(i: number, patch: Partial<ContentBlock>) {
    const next = [...blocks];
    next[i] = { ...next[i], ...patch } as ContentBlock;
    onChange(next);
  }

  function removeBlock(i: number) {
    onChange(blocks.filter((_, j) => j !== i));
  }

  function moveBlock(i: number, dir: -1 | 1) {
    const next = [...blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDraggingOver(true);
  }

  function handleDragLeave() {
    setDraggingOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDraggingOver(false);
    await uploadImages(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="rounded border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-sub uppercase">
              {block.type === "text" ? "텍스트" : "이미지"}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0}
                className="rounded px-1.5 py-0.5 text-[12px] text-ink-sub hover:text-ink disabled:opacity-30">↑</button>
              <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}
                className="rounded px-1.5 py-0.5 text-[12px] text-ink-sub hover:text-ink disabled:opacity-30">↓</button>
              <button type="button" onClick={() => removeBlock(i)}
                className="rounded px-1.5 py-0.5 text-[12px] text-brand hover:underline">삭제</button>
            </div>
          </div>

          {block.type === "text" ? (
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(i, { content: e.target.value })}
              rows={4}
              placeholder="본문 텍스트를 입력하세요"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          ) : (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.url} alt={block.caption || "상품 이미지"} className="mb-2 max-h-60 w-full rounded-sm object-contain" />
              <input
                value={block.caption}
                onChange={(e) => updateBlock(i, { caption: e.target.value })}
                placeholder="이미지 캡션 (선택)"
                className="w-full rounded-sm border border-line px-2.5 py-1.5 text-[12px] outline-none focus:border-brand"
              />
            </div>
          )}
        </div>
      ))}

      {/* 드래그앤드롭 존 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[64px] items-center justify-center rounded border-2 border-dashed p-4 text-[12px] transition-colors ${
          draggingOver ? "border-brand bg-brand-light text-brand font-bold" : "border-line text-ink-sub"
        }`}
      >
        {uploading ? "업로드 중…" : draggingOver ? "여기에 놓으세요" : "이미지를 여기에 드래그하거나 아래 버튼을 사용하세요"}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...blocks, { type: "text", content: "" }])}
          className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-sub hover:border-ink hover:text-ink"
        >
          + 텍스트 블록 추가
        </button>
        <button
          type="button"
          onClick={() => { setUploadErr(null); fileInputRef.current?.click(); }}
          disabled={uploading}
          className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-ink-sub hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {uploading ? "업로드 중…" : "+ 이미지 블록 추가 (복수 선택 가능)"}
        </button>
      </div>

      {uploadErr && <p className="text-[12px] text-brand">{uploadErr}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          await uploadImages(files);
        }}
      />
    </div>
  );
}

// ── 메인 폼 ──────────────────────────────────────────────────
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
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function setGroup(idx: number, patch: Partial<ProductFormValue["optionGroups"][number]>) {
    const next = [...v.optionGroups];
    next[idx] = { ...next[idx], ...patch };
    setV((prev) => ({ ...prev, optionGroups: next }));
  }

  function addGroup() {
    setV((prev) => ({
      ...prev,
      optionGroups: [
        ...prev.optionGroups,
        { name: "", required: true, sortOrder: prev.optionGroups.length, values: [] },
      ],
    }));
  }

  function removeGroup(idx: number) {
    setV((prev) => ({ ...prev, optionGroups: prev.optionGroups.filter((_, i) => i !== idx) }));
  }

  function setValue(
    gIdx: number,
    vIdx: number,
    patch: Partial<{ label: string; priceDelta: number; sortOrder: number }>,
  ) {
    const next = [...v.optionGroups];
    const values = [...next[gIdx].values];
    values[vIdx] = { ...values[vIdx], ...patch };
    next[gIdx] = { ...next[gIdx], values };
    setV((prev) => ({ ...prev, optionGroups: next }));
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
    setV((prev) => ({ ...prev, optionGroups: next }));
  }

  function removeValue(gIdx: number, vIdx: number) {
    const next = [...v.optionGroups];
    next[gIdx] = { ...next[gIdx], values: next[gIdx].values.filter((_, i) => i !== vIdx) };
    setV((prev) => ({ ...prev, optionGroups: next }));
  }

  function submit() {
    setErr(null);
    start(async () => {
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${v.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...v,
          thumbnail: v.images[0] ?? v.thumbnail ?? undefined,
        }),
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
      {/* 기본 정보 */}
      <section className="rounded border border-line p-5">
        <h2 className="mb-4 text-[14px] font-bold text-ink">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="slug (URL용 ID)">
            <input
              value={v.slug}
              onChange={(e) => set("slug", e.target.value)}
              disabled={mode === "edit"}
              placeholder="carrier-box"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:bg-bg"
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
          <Field label="상품명">
            <input
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="정렬 순서">
            <input
              type="number"
              value={v.sortOrder}
              onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="기본 단가 (원 / 1개 기준)" className="sm:col-span-2">
            <input
              type="number"
              min={0}
              value={v.basePrice}
              onChange={(e) => set("basePrice", Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] text-ink-sub">
              단가표에 등록되지 않은 상품은 이 단가를 기준으로 계산됩니다. 옵션별 추가 단가는 아래 옵션 그룹에서 입력하세요.
            </p>
          </Field>
          <Field label="간단 설명 (상품명 아래 표시)" className="sm:col-span-2">
            <input
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="한 줄 소개 문구"
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
        {/* 숨김 필드 — 값 유지 */}
        <div className="hidden">
          <select value={v.binding} onChange={(e) => set("binding", e.target.value as BindingType)}>
            {BINDING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={v.paper} onChange={(e) => set("paper", e.target.value as PaperType)}>
            {PAPER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </section>

      {/* 상품 이미지 */}
      <section className="rounded border border-line p-5">
        <h2 className="mb-4 text-[14px] font-bold text-ink">상품 이미지</h2>
        <ImageGallery images={v.images} onChange={(imgs) => set("images", imgs)} />
      </section>

      {/* 옵션 그룹 */}
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
            옵션 그룹이 없습니다.
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
                        onChange={(e) => setValue(gi, vi, { priceDelta: Number(e.target.value) || 0 })}
                        placeholder="추가 단가 (원)"
                        title="기본 단가에 더해지는 옵션별 추가 금액"
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

      {/* 상품 상세 내용 */}
      <section className="rounded border border-line p-5">
        <h2 className="mb-1 text-[14px] font-bold text-ink">상품 상세 내용</h2>
        <p className="mb-4 text-[12px] text-ink-sub">
          상품 페이지 하단에 표시됩니다. 텍스트와 이미지를 자유롭게 조합하세요.
        </p>
        <ContentBlockEditor
          blocks={v.contentBlocks}
          onChange={(b) => set("contentBlocks", b)}
        />
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
