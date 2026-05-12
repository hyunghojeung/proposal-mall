import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "주문현황" },
  { href: "/admin/products",   label: "상품 관리" },
  { href: "/admin/categories", label: "카테고리 관리" },
  { href: "/admin/pricing", label: "단가표" },
  { href: "/admin/inquiries", label: "고객문의" },
  { href: "/admin/diagrams", label: "전개도 관리" },
  { href: "/admin/faqs", label: "FAQ" },
  { href: "/admin/notices", label: "공지사항" },
  { href: "/admin/stamp", label: "도장 이미지" },
];

export function AdminShell({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#131626]">
      {/* ── 헤더 ── */}
      <header className="border-b border-[#262a3d] bg-[#1a1d2e]">
        <div className="flex h-[72px] w-full items-center justify-between px-8">
          <Link href="/admin" className="text-[24px] font-black italic text-brand">
            제안서박스몰 · 관리자
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="text-[16px] text-[#8a90b0] hover:text-white transition-colors">
              사이트로
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex w-full gap-8 px-8 py-8">
        {/* ── 사이드바 ── */}
        <aside className="w-60 shrink-0">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? active === "dashboard"
                  : active === item.href.split("/").pop();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-5 py-3 text-[15px] font-medium transition-colors ${
                    isActive
                      ? "bg-brand/20 font-bold text-brand"
                      : "text-[#9095b8] hover:bg-[#1e2235] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── 메인 콘텐츠 ── */}
        <main className="min-w-0 flex-1 rounded-xl border border-[#262a3d] bg-[#1e2235] p-8">
          <h1 className="border-b border-[#262a3d] pb-5 text-[28px] font-black tracking-tight text-white">
            {title}
          </h1>
          <div className="mt-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
