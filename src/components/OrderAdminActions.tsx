"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = [
  { value: "PENDING",       label: "결제대기" },
  { value: "PAID",          label: "결제완료" },
  { value: "IN_PRODUCTION", label: "제작중" },
  { value: "DELIVERED",     label: "발송완료" },
];

export function OrderAdminActions({
  serial,
  initialStatus,
  initialMemo,
}: {
  serial: string;
  initialStatus: string;
  initialMemo: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function save(payload: { status?: string; memo?: string }) {
    start(async () => {
      setErr(null);
      try {
        const res = await fetch(`/api/admin/orders/${serial}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setErr(data?.error ?? "저장 실패");
          return;
        }
        setSavedAt(new Date().toLocaleTimeString("ko-KR"));
        router.refresh();
      } catch {
        setErr("네트워크 오류");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-[16px] font-bold text-ink">상태</label>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 rounded border border-line px-3 py-3 text-[16px] outline-none focus:border-brand"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || status === initialStatus}
            onClick={() => save({ status })}
            className="rounded bg-brand px-5 py-3 text-[16px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            변경
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[16px] font-bold text-ink">관리 메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="내부 메모 (고객에게 노출되지 않음)"
          className="w-full rounded border border-line px-3 py-3 text-[15px] outline-none focus:border-brand"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={pending || memo === (initialMemo ?? "")}
            onClick={() => save({ memo })}
            className="rounded border border-line px-5 py-2.5 text-[15px] font-medium text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            메모 저장
          </button>
        </div>
      </div>

      {err && <p className="text-[15px] font-medium text-brand">{err}</p>}
      {savedAt && !err && (
        <p className="text-[14px] text-ink-sub">{savedAt} 에 저장됨</p>
      )}
    </div>
  );
}
