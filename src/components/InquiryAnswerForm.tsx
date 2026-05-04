"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InquiryAnswerForm({
  id,
  initialAnswer,
  initialStatus,
}: {
  id: number;
  initialAnswer: string | null;
  initialStatus: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState(initialAnswer ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(extra?: { status?: "CLOSED" }) {
    start(async () => {
      setErr(null);
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, ...(extra ?? {}) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(data?.error ?? "저장 실패");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        maxLength={5000}
        placeholder="답변 내용 (저장 시 ANSWERED 상태로 자동 전환됩니다)"
        className="w-full rounded-sm border border-line px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      {err && <p className="text-[12px] text-brand">{err}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !answer.trim()}
          onClick={() => submit()}
          className="rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          답변 저장
        </button>
        {initialStatus !== "CLOSED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit({ status: "CLOSED" })}
            className="rounded-sm border border-line px-3 py-2 text-[12px] font-medium text-ink hover:border-ink"
          >
            종결 처리
          </button>
        )}
      </div>
    </div>
  );
}
