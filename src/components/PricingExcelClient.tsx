"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const TABS = [
  { type: "paper", label: "내지 단가표", filename: "pricing-paper.xlsx" },
  { type: "binding", label: "제본 단가표", filename: "pricing-binding.xlsx" },
  { type: "box", label: "박스 단가표", filename: "pricing-box.xlsx" },
] as const;

type TabType = (typeof TABS)[number]["type"];

export function PricingExcelClient() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: TabType; text: string; ok: boolean } | null>(null);
  const inputRefs = {
    paper: useRef<HTMLInputElement>(null),
    binding: useRef<HTMLInputElement>(null),
    box: useRef<HTMLInputElement>(null),
  } as const;

  function upload(type: TabType, file: File) {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/admin/pricing/${type}`, {
        method: "POST",
        body: file,
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; written?: number; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setMsg({ type, text: data?.error ?? "업로드 실패", ok: false });
      } else {
        setMsg({
          type,
          text: `${data.written}행이 적용되었습니다.`,
          ok: true,
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {TABS.map((t) => (
        <div key={t.type} className="flex flex-wrap items-center gap-3 rounded border border-line p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">{t.label}</p>
            <p className="mt-0.5 text-[11px] text-ink-sub">
              엑셀 다운 → 수정 → 다시 업로드. 업로드 시 해당 테이블이 통째로 교체됩니다.
            </p>
            {msg?.type === t.type && (
              <p
                className={`mt-2 text-[12px] ${msg.ok ? "text-ink" : "text-brand"}`}
              >
                {msg.ok ? "✓ " : ""}
                {msg.text}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <a
              href={`/api/admin/pricing/${t.type}`}
              className="rounded-sm border border-line px-3 py-2 text-[13px] hover:border-ink"
            >
              엑셀 다운로드
            </a>
            <input
              ref={inputRefs[t.type]}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(t.type, file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRefs[t.type].current?.click()}
              className="rounded-sm bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && msg?.type === t.type ? "업로드 중…" : "엑셀 업로드"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
