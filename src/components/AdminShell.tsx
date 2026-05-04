import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "주문현황" },
  { href: "/admin/inquiries", label: "고객문의" },
  { href: "/admin/faqs", label: "FAQ" },
  { href: "/admin/notices", label: "공지사항" },
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
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <Link href="/admin" className="text-[18px] font-black italic text-brand">
            제안서몰 · 관리자
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[12px] text-ink-sub hover:text-ink">
              사이트로
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? active === "dashboard"
                  : active === item.href.split("/").pop();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-sm px-3 py-2 text-[13px] transition-colors ${
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

        <main className="min-w-0 flex-1 rounded border border-line bg-white p-6">
          <h1 className="border-b border-line pb-4 text-[20px] font-black tracking-tight text-ink">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
