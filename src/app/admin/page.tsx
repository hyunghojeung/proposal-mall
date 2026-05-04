import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/auth";

const SECTIONS = [
  { href: "/admin/orders", label: "주문현황" },
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/options", label: "옵션 관리" },
  { href: "/admin/pricing", label: "단가표 관리" },
  { href: "/admin/inquiries", label: "고객문의 관리" },
  { href: "/admin/faqs", label: "FAQ 관리" },
  { href: "/admin/notices", label: "공지사항 관리" },
];

export const metadata = { title: "관리자 | 제안서몰" };

export default function AdminHome() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-page px-6 py-12">
      <header className="flex items-center justify-between border-b border-line pb-6">
        <div>
          <h1 className="text-[24px] font-black tracking-tight text-ink">관리자 패널</h1>
          <p className="mt-1 text-[13px] text-ink-sub">제안서몰 운영 관리</p>
        </div>
      </header>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded border border-line bg-white p-5 transition-colors hover:border-brand hover:text-brand"
            >
              <span className="text-[14px] font-bold">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
