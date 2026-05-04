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
      <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-6">
        <Link
          href="/"
          className="shrink-0 text-[22px] font-black italic tracking-tight text-brand"
        >
          제안서몰
        </Link>

        <form
          action="/products"
          className="flex max-w-[280px] flex-1 items-center overflow-hidden rounded-full border-[1.5px] border-brand"
        >
          <input
            type="search"
            name="q"
            placeholder="찾으시는 상품을 검색하세요"
            className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2 text-[13px] text-ink outline-none"
          />
          <button
            type="submit"
            aria-label="검색"
            className="flex shrink-0 items-center bg-brand px-3.5 py-2 text-[15px] text-white transition-colors hover:bg-brand-dark"
          >
            <svg
              width="16"
              height="16"
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
              className="whitespace-nowrap rounded-sm px-4 py-2 text-[14px] font-bold text-ink transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
