"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export function FaqAdminClient({ initialFaqs }: { initialFaqs: Faq[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const blank: Faq = {
    id: 0,
    category: "주문",
    question: "",
    answer: "",
    sortOrder: initialFaqs.length,
    isActive: true,
  };
  const [draft, setDraft] = useState<Faq>(blank);

  function reset() {
    setCreating(false);
    setEditingId(null);
    setDraft(blank);
    setErr(null);
  }

  function save() {
    start(async () => {
      setErr(null);
      const url = editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          question: draft.question,
          answer: draft.answer,
          sortOrder: draft.sortOrder,
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
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
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
            + 새 FAQ 추가
          </button>
        )}
      </div>

      {(creating || editingId !== null) && (
        <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={reset} pending={pending} err={err} />
      )}

      <div className="space-y-2">
        {initialFaqs.length === 0 ? (
          <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[13px] text-ink-sub">
            등록된 FAQ가 없습니다.
          </p>
        ) : (
          initialFaqs.map((f) => (
            <div
              key={f.id}
              className={`rounded border bg-white p-4 ${f.isActive ? "border-line" : "border-line opacity-60"}`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="rounded-sm bg-bg px-2 py-0.5 text-[11px] font-medium text-ink-sub">
                  {f.category}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">{f.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-sub">{f.answer}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(f.id);
                      setDraft(f);
                      setCreating(false);
                    }}
                    className="rounded-sm border border-line px-2.5 py-1 text-[12px] hover:border-ink"
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="rounded-sm border border-line px-2.5 py-1 text-[12px] text-brand hover:border-brand"
                  >
                    삭제
                  </button>
                </div>
              </div>
              {!f.isActive && (
                <p className="mt-2 text-[11px] text-ink-sub">비공개 (사이트에 노출되지 않음)</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Editor({
  draft,
  setDraft,
  onSave,
  onCancel,
  pending,
  err,
}: {
  draft: Faq;
  setDraft: (d: Faq) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
  err: string | null;
}) {
  return (
    <div className="mb-4 rounded border border-brand bg-brand-light/40 p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="카테고리">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          >
            {["주문", "결제", "배송", "제작", "기타"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="질문">
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </Field>
      </div>
      <Field label="답변" className="mt-3">
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          rows={4}
          className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="정렬 순서">
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
            className="w-full rounded-sm border border-line px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </Field>
        <label className="mt-7 flex items-center gap-2 text-[13px]">
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
          disabled={pending || !draft.question.trim() || !draft.answer.trim()}
          onClick={onSave}
          className="rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-sm border border-line px-4 py-2 text-[13px] hover:border-ink"
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
