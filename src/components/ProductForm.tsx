"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductCategory, BindingType, PaperType } from "@prisma/client";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string }
  | { type: "image_text"; imageUrl: string; imagePosition: "left" | "right"; title: string; content: string }
  | { type: "feature_grid"; heading: string; columns: 2 | 3; items: { icon: string; title: string; desc: string }[] }
  | { type: "image_grid"; heading: string; columns: 2 | 3; items: { imageUrl: string; title: string; desc: string }[] }
  | { type: "banner"; imageUrl: string; title: string; subtitle: string; align: "left" | "center" }
  | { type: "divider"; label: string };

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
  const [fileDragOver, setFileDragOver] = useState(false);
  const [dragSrcIdx,   setDragSrcIdx]   = useState<number | null>(null);
  const [dragOverIdx,  setDragOverIdx]  = useState<number | null>(null);
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

  /* ── 이미지 간 드래그 재정렬 ── */
  function handleImgDragStart(e: React.DragEvent, i: number) {
    setDragSrcIdx(i);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  }

  function handleImgDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== i) setDragOverIdx(i);
  }

  function handleImgDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    if (dragSrcIdx === null || dragSrcIdx === i) {
      setDragSrcIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragSrcIdx, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDragSrcIdx(null);
    setDragOverIdx(null);
  }

  function handleImgDragEnd() {
    setDragSrcIdx(null);
    setDragOverIdx(null);
  }

  /* ── 파일 드롭 (신규 이미지 추가) ── */
  function handleZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (dragSrcIdx !== null) return;
    if (images.length < 5 && e.dataTransfer.types.includes("Files")) setFileDragOver(true);
  }

  function handleZoneDragLeave() {
    setFileDragOver(false);
  }

  async function handleZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setFileDragOver(false);
    if (dragSrcIdx !== null) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
    );
    const available = 5 - images.length;
    const newUrls: string[] = [];
    for (const file of files.slice(0, available)) {
      try { newUrls.push(await uploadFile(file)); } catch { /* 개별 실패 무시 */ }
    }
    if (newUrls.length > 0) onChange([...images, ...newUrls]);
  }

  return (
    <div>
      {/* 드래그앤드롭 존 */}
      <div
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneDragLeave}
        onDrop={handleZoneDrop}
        className={`mb-3 flex min-h-[60px] flex-wrap gap-3 rounded border-2 border-dashed p-3 transition-colors ${
          fileDragOver ? "border-brand bg-brand-light" : "border-line"
        }`}
      >
        {images.length === 0 && !fileDragOver && (
          <p className="flex w-full items-center justify-center text-[14px] text-ink-sub">
            이미지를 여기에 드래그하거나 아래 버튼으로 추가하세요
          </p>
        )}
        {fileDragOver && (
          <p className="flex w-full items-center justify-center text-[14px] font-bold text-brand">
            여기에 놓으세요
          </p>
        )}

        {images.map((url, i) => (
          <div
            key={url}
            className="group relative"
            draggable
            onDragStart={(e) => handleImgDragStart(e, i)}
            onDragOver={(e)  => handleImgDragOver(e, i)}
            onDrop={(e)      => handleImgDrop(e, i)}
            onDragEnd={handleImgDragEnd}
            style={{ cursor: "grab", opacity: dragSrcIdx === i ? 0.4 : 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`상품 이미지 ${i + 1}`}
              className={`h-24 w-24 rounded-sm object-cover transition-all ${
                dragOverIdx === i && dragSrcIdx !== i
                  ? "ring-2 ring-brand ring-offset-1"
                  : i === 0
                  ? "border-2 border-brand"
                  : "border border-line"
              }`}
              draggable={false}
            />
            {/* 대표 뱃지 */}
            {i === 0 && (
              <span className="absolute left-0 top-0 rounded-br-sm rounded-tl-sm bg-brand px-1.5 py-0.5 text-[12px] font-bold text-white">
                대표
              </span>
            )}
            {/* 드래그 핸들 아이콘 */}
            <span className="absolute bottom-1 right-1 text-white/70 text-[16px] select-none pointer-events-none">
              ⠿
            </span>
            {/* 호버 오버레이 */}
            <div className="absolute inset-0 hidden rounded-sm bg-black/50 group-hover:flex flex-col items-center justify-center gap-1">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setRepresentative(i)}
                  className="rounded bg-brand px-2 py-0.5 text-[12px] font-bold text-white hover:bg-brand-dark"
                >
                  대표 설정
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="rounded bg-black/70 px-2 py-0.5 text-[12px] text-white hover:bg-black"
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
            className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[14px] text-ink-sub hover:border-brand hover:text-brand disabled:opacity-50"
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
          <p className="text-[14px] text-brand">{upload.uploadErr}</p>
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
      <p className="mt-2 text-[13px] text-ink-sub">
        최대 5장 · JPG/PNG/WEBP · 10MB 이하 · 이미지를 드래그하여 순서 변경 · 커서를 올리면 대표 설정/삭제
      </p>
    </div>
  );
}

// ── 콘텐츠 블록 에디터 ───────────────────────────────────────
const BLOCK_LABEL: Record<ContentBlock["type"], string> = {
  text:         "텍스트",
  image:        "이미지",
  image_text:   "이미지 + 텍스트",
  feature_grid: "특징 그리드",
  image_grid:   "이미지 카드 그리드",
  banner:       "배너",
  divider:      "구분선",
};

function ContentBlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (b: ContentBlock[]) => void;
}) {
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  // 단일 이미지 업로드 콜백 (블록 내부 이미지 교체용)
  const uploadCbRef   = useRef<((url: string) => void) | null>(null);

  /* ── 다중 이미지 → 새 이미지 블록들 ── */
  async function uploadNewImageBlocks(files: File[]) {
    const imgs = files.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
    );
    if (!imgs.length) return;
    setUploading(true);
    setUploadErr(null);
    const added: ContentBlock[] = [];
    for (const f of imgs) {
      try { added.push({ type: "image", url: await uploadFile(f), caption: "" }); }
      catch (e) { setUploadErr(e instanceof Error ? e.message : "업로드 실패"); }
    }
    if (added.length) onChange([...blocks, ...added]);
    setUploading(false);
  }

  /* ── 단일 이미지 → 콜백으로 URL 전달 ── */
  function pickImage(onDone: (url: string) => void) {
    uploadCbRef.current = onDone;
    if (fileInputRef.current) { fileInputRef.current.multiple = false; fileInputRef.current.click(); }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (uploadCbRef.current) {
      setUploading(true); setUploadErr(null);
      try { uploadCbRef.current(await uploadFile(files[0])); }
      catch (er) { setUploadErr(er instanceof Error ? er.message : "업로드 실패"); }
      finally {
        setUploading(false);
        uploadCbRef.current = null;
        if (fileInputRef.current) fileInputRef.current.multiple = true;
      }
    } else {
      await uploadNewImageBlocks(files);
    }
  }

  /* ── 블록 공통 helpers ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateBlock(i: number, patch: Record<string, any>) {
    const next = [...blocks];
    next[i] = { ...next[i], ...patch } as ContentBlock;
    onChange(next);
  }
  function removeBlock(i: number) { onChange(blocks.filter((_, j) => j !== i)); }
  function moveBlock(i: number, dir: -1 | 1) {
    const next = [...blocks]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  }

  /* ── feature_grid 항목 helpers ── */
  function updateItem(bi: number, ii: number, patch: Partial<{ icon: string; title: string; desc: string }>) {
    const b = blocks[bi]; if (b.type !== "feature_grid") return;
    updateBlock(bi, { items: b.items.map((it, idx) => idx === ii ? { ...it, ...patch } : it) });
  }
  function addItem(bi: number) {
    const b = blocks[bi]; if (b.type !== "feature_grid") return;
    updateBlock(bi, { items: [...b.items, { icon: "", title: "", desc: "" }] });
  }
  function removeItem(bi: number, ii: number) {
    const b = blocks[bi]; if (b.type !== "feature_grid") return;
    updateBlock(bi, { items: b.items.filter((_, idx) => idx !== ii) });
  }

  /* ── image_grid 항목 helpers ── */
  function updateGridItem(bi: number, ii: number, patch: Partial<{ imageUrl: string; title: string; desc: string }>) {
    const b = blocks[bi]; if (b.type !== "image_grid") return;
    updateBlock(bi, { items: b.items.map((it, idx) => idx === ii ? { ...it, ...patch } : it) });
  }
  function addGridItem(bi: number) {
    const b = blocks[bi]; if (b.type !== "image_grid") return;
    updateBlock(bi, { items: [...b.items, { imageUrl: "", title: "", desc: "" }] });
  }
  function removeGridItem(bi: number, ii: number) {
    const b = blocks[bi]; if (b.type !== "image_grid") return;
    updateBlock(bi, { items: b.items.filter((_, idx) => idx !== ii) });
  }

  /* ── 드래그앤드롭 ── */
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDraggingOver(true); }
  function handleDragLeave() { setDraggingOver(false); }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDraggingOver(false);
    await uploadNewImageBlocks(Array.from(e.dataTransfer.files));
  }

  const inputCls = "w-full rounded-sm border border-line px-2.5 py-1.5 text-[14px] outline-none focus:border-brand";
  const textareaCls = "w-full rounded-sm border border-line px-2.5 py-2 text-[14px] outline-none focus:border-brand";
  const btnUpload = (label: string, onClick: () => void) => (
    <button type="button" disabled={uploading} onClick={onClick}
      className="rounded-sm border border-line px-3 py-1.5 text-[13px] text-ink-sub hover:border-brand disabled:opacity-50">
      {uploading ? "업로드 중…" : label}
    </button>
  );

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="rounded border border-line p-3">

          {/* 블록 헤더 */}
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded bg-bg px-2 py-0.5 text-[12px] font-bold text-ink-sub">
              {BLOCK_LABEL[block.type]}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0}
                className="rounded px-1.5 py-0.5 text-[14px] text-ink-sub hover:text-ink disabled:opacity-30">↑</button>
              <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}
                className="rounded px-1.5 py-0.5 text-[14px] text-ink-sub hover:text-ink disabled:opacity-30">↓</button>
              <button type="button" onClick={() => removeBlock(i)}
                className="rounded px-2 py-0.5 text-[13px] text-brand hover:underline">삭제</button>
            </div>
          </div>

          {/* ── 텍스트 ── */}
          {block.type === "text" && (
            <textarea value={block.content} rows={4} placeholder="본문 텍스트를 입력하세요"
              onChange={(e) => updateBlock(i, { content: e.target.value })}
              className={textareaCls} />
          )}

          {/* ── 이미지 ── */}
          {block.type === "image" && (
            <div className="space-y-2">
              {block.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.url} alt={block.caption || "이미지"} className="max-h-52 w-full rounded-sm border border-line object-contain" />
              )}
              {btnUpload(block.url ? "이미지 교체" : "이미지 업로드", () => pickImage((url) => updateBlock(i, { url })))}
              <input value={block.caption} placeholder="이미지 캡션 (선택)"
                onChange={(e) => updateBlock(i, { caption: e.target.value })} className={inputCls} />
            </div>
          )}

          {/* ── 이미지 + 텍스트 ── */}
          {block.type === "image_text" && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-ink-sub">이미지 위치</span>
                <select value={block.imagePosition}
                  onChange={(e) => updateBlock(i, { imagePosition: e.target.value })}
                  className="rounded-sm border border-line px-2 py-1 text-[14px] outline-none focus:border-brand">
                  <option value="left">왼쪽</option>
                  <option value="right">오른쪽</option>
                </select>
              </div>
              {block.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.imageUrl} alt="이미지" className="max-h-40 rounded-sm border border-line object-contain" />
              )}
              {btnUpload(block.imageUrl ? "이미지 교체" : "이미지 업로드", () => pickImage((url) => updateBlock(i, { imageUrl: url })))}
              <input value={block.title} placeholder="제목 (선택)"
                onChange={(e) => updateBlock(i, { title: e.target.value })} className={inputCls} />
              <textarea value={block.content} rows={4} placeholder="본문 내용"
                onChange={(e) => updateBlock(i, { content: e.target.value })} className={textareaCls} />
            </div>
          )}

          {/* ── 특징 그리드 ── */}
          {block.type === "feature_grid" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={block.heading} placeholder="섹션 제목 (선택)"
                  onChange={(e) => updateBlock(i, { heading: e.target.value })}
                  className="flex-1 rounded-sm border border-line px-2.5 py-1.5 text-[14px] outline-none focus:border-brand" />
                <select value={block.columns}
                  onChange={(e) => updateBlock(i, { columns: Number(e.target.value) })}
                  className="rounded-sm border border-line px-2 py-1.5 text-[14px] outline-none focus:border-brand">
                  <option value={2}>2열</option>
                  <option value={3}>3열</option>
                </select>
              </div>
              <div className="space-y-2">
                {block.items.map((item, ii) => (
                  <div key={ii} className="rounded border border-line/60 bg-bg p-2 space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <input value={item.icon} placeholder="아이콘 (01 / ✓)"
                        onChange={(e) => updateItem(i, ii, { icon: e.target.value })}
                        className="w-20 rounded-sm border border-line px-2 py-1 text-[14px] outline-none focus:border-brand" />
                      <input value={item.title} placeholder="제목"
                        onChange={(e) => updateItem(i, ii, { title: e.target.value })}
                        className="flex-1 rounded-sm border border-line px-2 py-1 text-[14px] outline-none focus:border-brand" />
                      <button type="button" onClick={() => removeItem(i, ii)}
                        className="text-[13px] text-brand hover:underline">삭제</button>
                    </div>
                    <textarea value={item.desc} rows={2} placeholder="설명"
                      onChange={(e) => updateItem(i, ii, { desc: e.target.value })}
                      className="w-full rounded-sm border border-line px-2 py-1 text-[13px] outline-none focus:border-brand" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addItem(i)}
                className="rounded-sm border border-dashed border-line px-3 py-1 text-[13px] text-ink-sub hover:border-ink hover:text-ink">
                + 항목 추가
              </button>
            </div>
          )}

          {/* ── 이미지 카드 그리드 ── */}
          {block.type === "image_grid" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={block.heading} placeholder="섹션 제목 (선택)"
                  onChange={(e) => updateBlock(i, { heading: e.target.value })}
                  className="flex-1 rounded-sm border border-line px-2.5 py-1.5 text-[14px] outline-none focus:border-brand" />
                <select value={block.columns}
                  onChange={(e) => updateBlock(i, { columns: Number(e.target.value) })}
                  className="rounded-sm border border-line px-2 py-1.5 text-[14px] outline-none focus:border-brand">
                  <option value={2}>2열</option>
                  <option value={3}>3열</option>
                </select>
              </div>
              <div className={`grid gap-3 ${block.columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {block.items.map((item, ii) => (
                  <div key={ii} className="rounded border border-line bg-bg p-2 space-y-1.5">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.title || "이미지"}
                        className="w-full rounded-sm object-cover aspect-square" />
                    ) : (
                      <div className="w-full aspect-square rounded-sm bg-line flex items-center justify-center text-[12px] text-ink-sub">
                        이미지 없음
                      </div>
                    )}
                    <button type="button" disabled={uploading}
                      onClick={() => pickImage((url) => updateGridItem(i, ii, { imageUrl: url }))}
                      className="w-full rounded-sm border border-line py-1 text-[12px] text-ink-sub hover:border-brand disabled:opacity-50">
                      {uploading ? "…" : item.imageUrl ? "교체" : "업로드"}
                    </button>
                    <input value={item.title} placeholder="제목"
                      onChange={(e) => updateGridItem(i, ii, { title: e.target.value })}
                      className="w-full rounded-sm border border-line px-2 py-1 text-[13px] outline-none focus:border-brand" />
                    <textarea value={item.desc} rows={2} placeholder="설명"
                      onChange={(e) => updateGridItem(i, ii, { desc: e.target.value })}
                      className="w-full rounded-sm border border-line px-2 py-1 text-[12px] outline-none focus:border-brand" />
                    <button type="button" onClick={() => removeGridItem(i, ii)}
                      className="w-full text-[12px] text-brand hover:underline">카드 삭제</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addGridItem(i)}
                className="rounded-sm border border-dashed border-line px-3 py-1 text-[13px] text-ink-sub hover:border-ink hover:text-ink">
                + 카드 추가
              </button>
            </div>
          )}

          {/* ── 배너 ── */}
          {block.type === "banner" && (
            <div className="space-y-2">
              {block.imageUrl && (
                <div className="relative h-20 overflow-hidden rounded-sm border border-line"
                  style={{ backgroundImage: `url(${block.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-[12px]">배경 미리보기</span>
                  </div>
                </div>
              )}
              {btnUpload(block.imageUrl ? "배경 이미지 교체" : "배경 이미지 업로드", () => pickImage((url) => updateBlock(i, { imageUrl: url })))}
              <input value={block.title} placeholder="메인 제목"
                onChange={(e) => updateBlock(i, { title: e.target.value })} className={inputCls} />
              <input value={block.subtitle} placeholder="부제목 (선택)"
                onChange={(e) => updateBlock(i, { subtitle: e.target.value })} className={inputCls} />
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-ink-sub">텍스트 정렬</span>
                <select value={block.align}
                  onChange={(e) => updateBlock(i, { align: e.target.value })}
                  className="rounded-sm border border-line px-2 py-1 text-[14px] outline-none focus:border-brand">
                  <option value="left">왼쪽</option>
                  <option value="center">가운데</option>
                </select>
              </div>
            </div>
          )}

          {/* ── 구분선 ── */}
          {block.type === "divider" && (
            <input value={block.label} placeholder="구분선 텍스트 (선택 — 비우면 선만 표시)"
              onChange={(e) => updateBlock(i, { label: e.target.value })} className={inputCls} />
          )}

        </div>
      ))}

      {/* 드래그앤드롭 존 */}
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`flex min-h-[56px] items-center justify-center rounded border-2 border-dashed p-4 text-[13px] transition-colors ${
          draggingOver ? "border-brand bg-brand-light text-brand font-bold" : "border-line text-ink-sub"
        }`}>
        {uploading ? "업로드 중…" : draggingOver ? "여기에 놓으세요" : "이미지를 드래그하면 이미지 블록으로 추가됩니다"}
      </div>

      {/* 블록 추가 버튼 */}
      <div className="flex flex-wrap gap-2">
        {([
          ["+ 텍스트",       () => onChange([...blocks, { type: "text", content: "" }])],
          ["+ 이미지",       () => { uploadCbRef.current = null; if (fileInputRef.current) { fileInputRef.current.multiple = true; fileInputRef.current.click(); } }],
          ["+ 이미지+텍스트", () => onChange([...blocks, { type: "image_text", imageUrl: "", imagePosition: "left", title: "", content: "" }])],
          ["+ 특징 그리드",      () => onChange([...blocks, { type: "feature_grid", heading: "", columns: 3, items: [{ icon: "", title: "", desc: "" }, { icon: "", title: "", desc: "" }, { icon: "", title: "", desc: "" }] }])],
          ["+ 이미지 카드 그리드", () => onChange([...blocks, { type: "image_grid", heading: "", columns: 2, items: [{ imageUrl: "", title: "", desc: "" }, { imageUrl: "", title: "", desc: "" }] }])],
          ["+ 배너",             () => onChange([...blocks, { type: "banner", imageUrl: "", title: "", subtitle: "", align: "center" }])],
          ["+ 구분선",       () => onChange([...blocks, { type: "divider", label: "" }])],
        ] as [string, () => void][]).map(([label, onClick]) => (
          <button key={label} type="button" onClick={onClick} disabled={uploading && label === "+ 이미지"}
            className="rounded-sm border border-line px-3 py-1.5 text-[13px] text-ink-sub hover:border-ink hover:text-ink disabled:opacity-50">
            {label}
          </button>
        ))}
      </div>

      {uploadErr && <p className="text-[13px] text-brand">{uploadErr}</p>}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        multiple className="hidden" onChange={handleFileChange} />
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

  function handleNameChange(name: string) {
    set("name", name);
    if (mode === "create" && !v.slug) {
      const ascii = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      set("slug", ascii || `product-${Date.now().toString(36)}`);
    }
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
      const slug = v.slug || `product-${Date.now().toString(36)}`;
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...v,
          slug,
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
        <h2 className="mb-4 text-[16px] font-bold text-ink">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="slug (URL용 ID)">
            <input
              value={v.slug}
              onChange={(e) => set("slug", e.target.value)}
              disabled={mode === "edit"}
              placeholder="carrier-box"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand disabled:bg-bg"
            />
          </Field>
          <Field label="카테고리">
            <select
              value={v.category}
              onChange={(e) => set("category", e.target.value as ProductCategory)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="상품명">
            <input
              value={v.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="정렬 순서">
            <input
              type="number"
              value={v.sortOrder}
              onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="기본 단가 (원 / 1개 기준)" className="sm:col-span-2">
            <input
              type="number"
              min={0}
              value={v.basePrice}
              onChange={(e) => set("basePrice", Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand"
            />
            <p className="mt-1 text-[13px] text-ink-sub">
              단가표가 없을 때 기준 단가. 옵션에도 단가를 입력하면 합산됩니다 (기본 단가 + 옵션 단가).
            </p>
          </Field>
          <Field label="간단 설명 (상품명 아래 표시)" className="sm:col-span-2">
            <input
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="한 줄 소개 문구"
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[15px] outline-none focus:border-brand"
            />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[15px]">
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
        <h2 className="mb-4 text-[16px] font-bold text-ink">상품 이미지</h2>
        <ImageGallery images={v.images} onChange={(imgs) => set("images", imgs)} />
      </section>

      {/* 옵션 그룹 */}
      <section className="rounded border border-line p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">옵션 그룹</h2>
          <button
            type="button"
            onClick={addGroup}
            className="rounded-sm border border-line px-3 py-1 text-[14px] hover:border-ink"
          >
            + 그룹 추가
          </button>
        </div>
        {v.optionGroups.length === 0 ? (
          <p className="rounded border border-dashed border-line bg-bg px-4 py-8 text-center text-[14px] text-ink-sub">
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
                      className="w-full rounded-sm border border-line px-2.5 py-1.5 text-[15px] outline-none focus:border-brand"
                    />
                  </Field>
                  <Field label="정렬">
                    <input
                      type="number"
                      value={g.sortOrder}
                      onChange={(e) => setGroup(gi, { sortOrder: Number(e.target.value) || 0 })}
                      className="w-full rounded-sm border border-line px-2.5 py-1.5 text-[15px] outline-none focus:border-brand"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="rounded-sm border border-line px-2.5 py-1.5 text-[14px] text-brand hover:border-brand"
                  >
                    그룹 삭제
                  </button>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  {/* 컬럼 헤더 */}
                  <div className="mb-1 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <span className="text-[13px] font-bold text-ink-sub">옵션명</span>
                    <span className="text-[13px] font-bold text-ink-sub">단가 (원)</span>
                    <span className="text-[13px] font-bold text-ink-sub">정렬</span>
                    <span />
                  </div>
                  <div className="space-y-1.5">
                  {g.values.map((val, vi) => (
                    <div key={vi} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center">
                      <input
                        value={val.label}
                        onChange={(e) => setValue(gi, vi, { label: e.target.value })}
                        placeholder="A4, 인쇄형, 소형 …"
                        className="rounded-sm border border-line px-2.5 py-1.5 text-[15px] outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        min={0}
                        value={val.priceDelta}
                        onChange={(e) => setValue(gi, vi, { priceDelta: Math.max(0, Number(e.target.value) || 0) })}
                        placeholder="0"
                        className="rounded-sm border border-line px-2.5 py-1.5 text-[15px] outline-none focus:border-brand"
                      />
                      <input
                        type="number"
                        value={val.sortOrder}
                        onChange={(e) => setValue(gi, vi, { sortOrder: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="rounded-sm border border-line px-2.5 py-1.5 text-[15px] outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeValue(gi, vi)}
                        className="rounded-sm border border-line px-2.5 py-1 text-[13px] text-brand hover:border-brand"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addValue(gi)}
                    className="rounded-sm border border-dashed border-line px-3 py-1 text-[14px] text-ink-sub hover:border-ink hover:text-ink"
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
        <h2 className="mb-1 text-[16px] font-bold text-ink">상품 상세 내용</h2>
        <p className="mb-4 text-[14px] text-ink-sub">
          상품 페이지 하단에 표시됩니다. 텍스트와 이미지를 자유롭게 조합하세요.
        </p>
        <ContentBlockEditor
          blocks={v.contentBlocks}
          onChange={(b) => set("contentBlocks", b)}
        />
      </section>

      {err && <p className="text-[15px] font-medium text-brand">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !v.name}
          onClick={submit}
          className="rounded-sm bg-brand px-5 py-2.5 text-[16px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "create" ? "상품 등록" : "변경 사항 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          disabled={pending}
          className="rounded-sm border border-line px-5 py-2.5 text-[16px] hover:border-ink"
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
      <span className="mb-1 block text-[14px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
