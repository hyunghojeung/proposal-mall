import { redirect } from "next/navigation";
import Link from "next/link";
import { InquiryStatus, type Prisma } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";
import { InquiryAnswerForm } from "@/components/InquiryAnswerForm";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "고객문의 | 관리자" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: InquiryStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "미답변" },
  { value: "ANSWERED", label: "답변완료" },
  { value: "CLOSED", label: "종결" },
];

const STATUS_LABEL: Record<InquiryStatus, string> = {
  OPEN: "미답변",
  ANSWERED: "답변완료",
  CLOSED: "종결",
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  if (!isAdminAuthenticated()) redirect("/admin/login");

  const statusParam = searchParams.status;
  const where: Prisma.InquiryWhereInput = {};
  if (statusParam && statusParam !== "ALL" && statusParam in InquiryStatus) {
    where.status = statusParam as InquiryStatus;
  }

  const inquiries = await prisma.inquiry
    .findMany({ where, orderBy: { createdAt: "desc" }, take: 100 })
    .catch(() => []);

  return (
    <AdminShell active="inquiries" title="고객문의">
      <div className="flex flex-wrap gap-2 pb-5">
        {STATUS_FILTERS.map((f) => {
          const active = (statusParam ?? "ALL") === f.value;
          const href =
            f.value === "ALL" ? "/admin/inquiries" : `/admin/inquiries?status=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`rounded border px-4 py-2 text-[13px] transition-colors ${
                active
                  ? "border-brand bg-brand-light font-bold text-brand"
                  : "border-line text-ink hover:border-ink"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {inquiries.length === 0 ? (
        <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[14px] text-ink-sub">
          조건에 맞는 문의가 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <li key={q.id} className="rounded border border-line bg-white p-6">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="rounded bg-brand-light px-2.5 py-1 text-[12px] font-bold text-brand">
                  {STATUS_LABEL[q.status]}
                </span>
                <h3 className="text-[15px] font-bold text-ink">{q.subject}</h3>
                {q.isPrivate && (
                  <span className="text-[12px] text-ink-sub">비공개</span>
                )}
                <span className="ml-auto text-[12px] text-ink-sub">
                  {new Date(q.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-ink-sub">
                {q.name} · {q.email}
                {q.phone ? ` · ${q.phone}` : ""}
              </p>
              <p className="mt-3 whitespace-pre-wrap rounded border border-line bg-bg p-4 text-[14px] text-ink">
                {q.message}
              </p>
              <div className="mt-5">
                <p className="mb-2 text-[13px] font-bold text-ink">답변</p>
                <InquiryAnswerForm
                  id={q.id}
                  initialAnswer={q.answer}
                  initialStatus={q.status}
                />
                {q.answeredAt && (
                  <p className="mt-2 text-[12px] text-ink-sub">
                    {new Date(q.answeredAt).toLocaleString("ko-KR")} 답변 완료
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
