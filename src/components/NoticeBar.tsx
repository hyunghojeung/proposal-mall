import Link from "next/link";

export function NoticeBar({
  text = "11월 신규 가입 EVENT — 첫 주문 5% 할인 자동 적용",
  ctaLabel = "자세히",
  ctaHref = "/notices",
}: {
  text?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Link
      href={ctaHref}
      className="flex items-center justify-center gap-6 bg-brand px-6 py-2.5 transition-colors hover:bg-brand-dark"
    >
      <p className="flex-1 text-center text-[13px] font-medium text-white">{text}</p>
      <span className="shrink-0 whitespace-nowrap rounded-full border border-white/55 px-3 py-[3px] text-[12px] font-bold text-white">
        {ctaLabel} →
      </span>
    </Link>
  );
}
