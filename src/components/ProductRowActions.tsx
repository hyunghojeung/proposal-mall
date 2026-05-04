"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ProductRowActions({
  id,
  isActive,
  hasOrders,
  type,
}: {
  id: number;
  isActive: boolean;
  hasOrders: boolean;
  type: "toggle" | "actions";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function patch(payload: Record<string, unknown>) {
    start(async () => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) router.refresh();
    });
  }

  function remove() {
    const msg = hasOrders
      ? "주문 이력이 있는 상품입니다. 비활성으로 전환됩니다. 진행하시겠습니까?"
      : "삭제하시겠습니까?";
    if (!confirm(msg)) return;
    start(async () => {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    });
  }

  if (type === "toggle") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => patch({ isActive: !isActive })}
        className={`rounded-sm border px-2.5 py-1 text-[11px] transition-colors ${
          isActive
            ? "border-brand bg-brand-light font-bold text-brand"
            : "border-line text-ink-sub hover:border-ink"
        }`}
      >
        {isActive ? "노출중" : "비공개"}
      </button>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      <Link
        href={`/admin/products/${id}`}
        className="rounded-sm border border-line px-2.5 py-1 text-[11px] hover:border-ink"
      >
        편집
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-brand hover:border-brand disabled:opacity-50"
      >
        {hasOrders ? "비활성" : "삭제"}
      </button>
    </div>
  );
}
