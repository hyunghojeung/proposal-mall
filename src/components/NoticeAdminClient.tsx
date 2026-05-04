"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Notice {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

export function NoticeAdminClient({ initialNotices }: { initialNotices: Notice[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const blank: Notice = {
    id: 0,
    title: "",
    content: "",
    isPinned: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  const [draft, setDraft] = useState<Notice>(blank);

  function reset() {
    setCreating(false);
    setEditingId(null);
    setDraft(blank);
    setErr(null);
  }

  function save() {
    start(async () => {
      setErr(null);
      const url = editingId ? `/api/admin/notices/${editingId}` : "/api/admin/notices";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          isPinned: draft.isPinned,
          isActive: draft.isActive,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(data?.error ?? "저장 실패");
        return;
      }
      reset();
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!confirm("삭제하시겠습니까?")) return;
    start(async () => {
      const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setErr("삭제 실패");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {!creating && !editingId && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setDraft(blank);
            }}
            className="rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark"
          >
            + 새 공지 작성
          </button>
        )}
      </div>

      {(creating || editingId !== null) && (
        <div className="mb-4 rounded border border-brand bg-brand-light/40 p-5">
          <Field label="제목">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <Field label="내용" className="mt-3">
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={6}
              className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-5 text-[13px]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isPinned}
                onChange={(e) => setDraft({ ...draft, isPinned: e.target.checked })}
                className="accent-[#E8481A]"
              />
              상단 고정
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                className="accent-[#E8481A]"
              />
              사이트에 노출
            </label>
          </div>
          {err && <p className="mt-3 text-[12px] text-brand">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending || !draft.title.trim() || !draft.content.trim()}
              onClick={save}
              className="rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="rounded-sm border border-line px-4 py-2 text-[13px] hover:border-ink"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {initialNotices.length === 0 ? (
          <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[13px] text-ink-sub">
            등록된 공지가 없습니다.
          </p>
        ) : (
          initialNotices.map((n) => (
            <div
              key={n.id}
              className={`rounded border bg-white p-4 ${n.isActive ? "border-line" : "border-line opacity-60"}`}
            >
              <div className="flex flex-wrap items-start gap-2">
                {n.isPinned && (
                  <span className="rounded-sm bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                    고정
                  </span>
                )}
                <h3 className="text-[14px] font-bold text-ink">{n.title}</h3>
                <span className="ml-auto text-[11px] text-ink-sub">
                  {new Date(n.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[13px] text-ink-sub">
                {n.content}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(n.id);
                    setDraft(n);
                    setCreating(false);
                  }}
                  className="rounded-sm border border-line px-2.5 py-1 text-[12px] hover:border-ink"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="rounded-sm border border-line px-2.5 py-1 text-[12px] text-brand hover:border-brand"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
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
