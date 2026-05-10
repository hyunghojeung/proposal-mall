"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/products", label: "전체상품" },
  { href: "/orders",   label: "주문현황" },
  { href: "/cart",     label: "장바구니" },
  { href: "/contact",  label: "고객문의" },
];


export function Header() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  function closeAll() {
    setMenuOpen(false);
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white">

        {/* ── PC 헤더 (md 이상) ── */}
        <div className="mx-auto hidden h-[70px] max-w-page items-center gap-6 px-6 md:flex">
          <Link
            href="/"
            className="shrink-0 text-[32px] font-black italic tracking-tight text-brand"
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
          </form>

          <nav className="ml-auto flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded px-4 py-2 text-[16px] font-bold transition-colors hover:text-brand ${
                  pathname === item.href ? "text-brand" : "text-ink"
                }`}
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </nav>
        </div>

        {/* ── 모바일 헤더 (md 미만) ── */}
        <div className="flex h-[60px] items-center justify-between px-4 md:hidden">
          {/* 로고 */}
          <Link
            href="/"
            onClick={closeAll}
            className="text-[22px] font-black italic tracking-tight text-brand"
          >
            제안서박스 <span className="text-ink">mall</span>
          </Link>

          {/* 우측 아이콘 모음 */}
          <div className="flex items-center gap-1">
            {/* 검색 토글 */}
            <button
              type="button"
              aria-label="검색"
              onClick={() => { setSearchOpen((v) => !v); setMenuOpen(false); }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                searchOpen ? "bg-brand text-white" : "text-ink-sub hover:text-brand"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </button>

            {/* 장바구니 바로가기 */}
            <Link
              href="/cart"
              onClick={closeAll}
              aria-label="장바구니"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-sub transition-colors hover:text-brand"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </Link>

            {/* 햄버거 토글 */}
            <button
              type="button"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              onClick={() => { setMenuOpen((v) => !v); setSearchOpen(false); }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                menuOpen ? "bg-brand text-white" : "text-ink-sub hover:text-brand"
              }`}
            >
              {menuOpen ? (
                /* X 아이콘 */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                /* 햄버거 아이콘 */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── 모바일 검색창 드롭다운 ── */}
        {searchOpen && (
          <div className="border-t border-line bg-white px-4 py-3 md:hidden">
            <form action="/products" className="flex items-center overflow-hidden rounded-full border-[1.5px] border-brand">
              <input
                type="search"
                name="q"
                placeholder="찾으시는 상품을 검색하세요"
                autoFocus
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-[15px] text-ink outline-none"
              />
              <button
                type="submit"
                aria-label="검색"
                onClick={closeAll}
                className="flex shrink-0 items-center bg-brand px-4 py-2.5 text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* ── 모바일 내비게이션 드롭다운 ── */}
        {menuOpen && (
          <nav className="border-t border-line bg-white md:hidden">

            {/* 전체상품 — 네이티브 <details> 아코디언 (JS 상태 불필요) */}
            <details className="group">
              <summary
                className={`flex cursor-pointer select-none items-center border-b border-line px-6 py-4 text-[17px] font-bold transition-colors hover:text-brand [&::-webkit-details-marker]:hidden [&::marker]:hidden ${
                  pathname.startsWith("/products") ? "text-brand" : "text-ink"
                }`}
              >
                전체상품
                <svg
                  className="ml-auto shrink-0 transition-transform duration-200 group-open:rotate-90"
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </summary>

              {/* 하위 카테고리 */}
              <div className="border-b border-line bg-[#fafafa] py-1">
                {/* 독립 카테고리 */}
                <Link href="/products?category=carrier-box" onClick={closeAll}
                  className="flex items-center px-8 py-3 text-[15px] text-ink transition-colors hover:text-brand">
                  제안서캐리어박스
                </Link>
                <Link href="/products?category=magnet-box" onClick={closeAll}
                  className="flex items-center px-8 py-3 text-[15px] text-ink transition-colors hover:text-brand">
                  자석박스
                </Link>

                {/* 제안서 제본 그룹 */}
                <div className="border-t border-line/60 px-8 pb-1 pt-3 text-[11px] font-bold tracking-widest text-ink-sub">
                  제안서 제본
                </div>
                <Link href="/products?category=3hole-binder" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />3공바인더
                </Link>
                <Link href="/products?category=pt-binder" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />PT용바인더
                </Link>
                <Link href="/products?category=hardcover-spring" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />하드커버스프링제본
                </Link>

                {/* 내지 인쇄 그룹 */}
                <div className="border-t border-line/60 px-8 pb-1 pt-3 text-[11px] font-bold tracking-widest text-ink-sub">
                  내지 인쇄
                </div>
                <Link href="/products?category=mojo" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />모조지
                </Link>
                <Link href="/products?category=snow" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />스노우지
                </Link>
                <Link href="/products?category=art" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />아트지
                </Link>
                <Link href="/products?category=import" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />수입지
                </Link>
                <Link href="/products?category=texture" onClick={closeAll}
                  className="flex items-center py-2.5 pl-12 pr-8 text-[14px] text-ink transition-colors hover:text-brand">
                  <span className="mr-2 h-1 w-1 shrink-0 rounded-full bg-ink-del" />질감용지
                </Link>
                <div className="h-2" />
              </div>
            </details>

            {/* 나머지 메뉴 항목 */}
            <Link href="/orders" onClick={closeAll}
              className={`flex items-center border-b border-line px-6 py-4 text-[17px] font-bold transition-colors hover:text-brand ${
                pathname === "/orders" ? "text-brand" : "text-ink"
              }`}>
              주문현황
              <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
            <Link href="/cart" onClick={closeAll}
              className={`flex items-center border-b border-line px-6 py-4 text-[17px] font-bold transition-colors hover:text-brand ${
                pathname === "/cart" ? "text-brand" : "text-ink"
              }`}>
              장바구니
              <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
            <Link href="/contact" onClick={closeAll}
              className={`flex items-center border-b border-line px-6 py-4 text-[17px] font-bold transition-colors hover:text-brand ${
                pathname === "/contact" ? "text-brand" : "text-ink"
              }`}>
              고객문의
              <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>

            <Link href="/admin" onClick={closeAll}
              className="flex items-center px-6 py-4 text-[15px] text-ink-sub transition-colors hover:text-brand">
              관리자 페이지
              <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          </nav>
        )}
      </header>

      {/* 오버레이 — 메뉴/검색 열렸을 때 배경 터치 닫기 */}
      {(menuOpen || searchOpen) && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeAll}
        />
      )}
    </>
  );
}
