import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "주문현황" },
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/pricing", label: "단가표" },
  { href: "/admin/inquiries", label: "고객문의" },
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
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1800px] items-center justify-between px-8">
          <Link href="/admin" className="text-[24px] font-black italic text-brand">
            제안서박스몰 · 관리자
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="text-[16px] text-ink-sub hover:text-ink">
              사이트로
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1800px] gap-8 px-8 py-8">
        <aside className="w-60 shrink-0">
          <nav className="space-y-1.5">
            {NAV.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? active === "dashboard"
                  : active === item.href.split("/").pop();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded px-5 py-3 text-[17px] font-medium transition-colors ${
                    isActive
                      ? "bg-brand-light font-bold text-brand"
                      : "text-ink hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded border border-line bg-white p-8">
          <h1 className="border-b border-line pb-5 text-[28px] font-black tracking-tight text-ink">
            {title}
          </h1>
          <div className="mt-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
