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
      <div className="flex flex-wrap gap-2 pb-6">
        {STATUS_FILTERS.map((f) => {
          const active = (statusParam ?? "ALL") === f.value;
          const href =
            f.value === "ALL" ? "/admin/inquiries" : `/admin/inquiries?status=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`rounded border px-5 py-2.5 text-[16px] transition-colors ${
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
        <p className="rounded border border-line bg-bg px-4 py-12 text-center text-[16px] text-ink-sub">
          조건에 맞는 문의가 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <li key={q.id} className="rounded border border-line bg-white p-6">

              {/* ── 헤더 ── */}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className={`rounded px-3 py-1 text-[13px] font-bold ${
                  q.status === "ANSWERED"
                    ? "bg-green-50 text-green-700"
                    : q.status === "CLOSED"
                    ? "bg-gray-100 text-gray-500"
                    : "bg-brand-light text-brand"
                }`}>
                  {STATUS_LABEL[q.status]}
                </span>
                <h3 className="text-[17px] font-bold text-ink">{q.subject}</h3>
                {q.isPrivate && (
                  <span className="text-[13px] text-ink-sub">비공개</span>
                )}
                <span className="ml-auto text-[14px] text-ink-sub">
                  {new Date(q.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="mt-1.5 text-[14px] text-ink-sub">
                {q.name} · {q.email}
                {q.phone ? ` · ${q.phone}` : ""}
              </p>

              {/* ── 문의 내용 ── */}
              <p className="mt-4 whitespace-pre-wrap rounded border border-line bg-bg p-4 text-[15px] leading-relaxed text-ink">
                {q.message}
              </p>

              {/* ── 답글 형태 답변 표시 ── */}
              {q.answer && (
                <div className="mt-3 flex gap-3">
                  {/* 들여쓰기 라인 */}
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-4 w-4 rounded-bl border-b-2 border-l-2 border-brand/40" />
                    <div className="w-0.5 flex-1 bg-brand/20" />
                  </div>
                  {/* 답변 박스 */}
                  <div className="flex-1 rounded border border-brand/20 bg-orange-50/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-black text-white">
                        관리자
                      </span>
                      {q.answeredAt && (
                        <span className="text-[12px] text-ink-sub">
                          {new Date(q.answeredAt).toLocaleString("ko-KR")}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                      {q.answer}
                    </p>
                  </div>
                </div>
              )}

              {/* ── 답변 입력 / 수정 폼 ── */}
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-[14px] font-bold text-ink-sub">
                  {q.answer ? "답변 수정" : "답변 작성"}
                </p>
                <InquiryAnswerForm
                  id={q.id}
                  initialAnswer={q.answer}
                  initialStatus={q.status}
                />
              </div>

            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
