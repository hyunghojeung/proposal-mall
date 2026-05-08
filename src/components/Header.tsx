import Link from "next/link";

const NAV = [
  { href: "/products", label: "전체상품" },
  { href: "/orders", label: "주문현황" },
  { href: "/cart", label: "장바구니" },
  { href: "/contact", label: "고객문의" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="mx-auto flex h-[70px] max-w-page items-center gap-6 px-6">
        <Link
          href="/"
          className="shrink-0 text-[34px] font-black italic tracking-tight text-brand"
        >
          제안서박스 <span className="text-ink">mall</span>
        </Link>

        <form
          action="/products"
          className="flex max-w-[320px] flex-1 items-center overflow-hidden rounded-full border-[1.5px] border-brand"
        >
          <input
            type="search"
            name="q"
            placeholder="찾으시는 상품을 검색하세요"
            className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-[15px] text-ink outline-none"
          />
          <button
            type="submit"
            aria-label="검색"
            className="flex shrink-0 items-center bg-brand px-4 py-2.5 text-white transition-colors hover:bg-brand-dark"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded px-4 py-2 text-[16px] font-bold text-ink transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            aria-label="관리자"
            title="관리자"
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-sub transition-colors hover:border-brand hover:text-brand"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
