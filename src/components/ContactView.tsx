"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "inquiry" | "faq" | "history";

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

interface Notice {
  id: number;
  title: string;
  isPinned: boolean;
  createdAt: string;
}

interface InquiryRow {
  id: number;
  subject: string;
  name: string;
  isPrivate: boolean;
  hasPassword: boolean;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  answeredAt: string | null;
}

interface InquiryDetail {
  id: number;
  subject: string;
  message: string;
  answer: string | null;
  answeredAt: string | null;
  status: string;
  createdAt: string;
  name: string;
}

export function ContactView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "inquiry";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [inquiryPassword, setInquiryPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 상세 조회 모달 상태
  const [detailTarget, setDetailTarget] = useState<InquiryRow | null>(null);
  const [detailPassword, setDetailPassword] = useState("");
  const [detailData, setDetailData] = useState<InquiryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/faqs").then((r) => r.json()).then((d) => setFaqs(d.faqs ?? [])).catch(() => {});
    fetch("/api/notices").then((r) => r.json()).then((d) => setNotices(d.notices ?? [])).catch(() => {});
    fetch("/api/inquiries").then((r) => r.json()).then((d) => setInquiries(d.inquiries ?? [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) { setFormError("개인정보 수집 및 이용에 동의해 주세요."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email, subject, message,
          password: inquiryPassword || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        fetch("/api/inquiries").then((r) => r.json()).then((d) => setInquiries(d.inquiries ?? [])).catch(() => {});
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "문의 접수에 실패했습니다.");
      }
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName(""); setPhone(""); setEmail(""); setSubject(""); setMessage("");
    setInquiryPassword(""); setAgree(false); setSubmitted(false); setFormError(null);
  }

  async function openDetail(inq: InquiryRow) {
    setDetailTarget(inq);
    setDetailPassword("");
    setDetailData(null);
    setDetailError(null);
    // 비밀번호 없는 문의는 바로 조회
    if (!inq.hasPassword) await fetchDetail(inq.id, "");
  }

  async function fetchDetail(id: number, pw: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/inquiries/${id}?password=${encodeURIComponent(pw)}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setDetailError(d.error ?? "확인 실패");
      } else {
        const d = (await res.json()) as { inquiry: InquiryDetail };
        setDetailData(d.inquiry);
      }
    } catch {
      setDetailError("네트워크 오류");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailTarget(null);
    setDetailData(null);
    setDetailError(null);
    setDetailPassword("");
  }

  const faqCategories = Array.from(new Set(faqs.map((f) => f.category)));

  function statusBadge(status: InquiryRow["status"]) {
    if (status === "ANSWERED") return { text: "답변완료", cls: "bg-green-50 text-green-700 border border-green-200" };
    if (status === "CLOSED")   return { text: "종료",    cls: "bg-gray-100 text-gray-500 border border-gray-200" };
    return { text: "대기중", cls: "bg-bg text-ink-sub border border-line" };
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "inquiry", label: "1:1 문의" },
    { id: "faq",     label: "자주 묻는 질문" },
    { id: "history", label: "문의 내역" },
  ];

  return (
    <>
      {/* Page title */}
      <div className="border-b border-line bg-white pt-8 pb-0 text-center md:pt-12">
        <h1 className="text-[22px] font-black tracking-tight text-ink md:text-[34px]">고객문의</h1>

        {/* Tabs */}
        <div className="mt-4 flex justify-center md:mt-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-3 text-[13px] font-bold transition-all sm:px-9 sm:py-4 sm:text-[17px] ${
                tab === t.id
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-sub hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-page px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px] lg:gap-7">

          {/* ── Left column ── */}
          <div>

            {/* ① 1:1 문의 */}
            {tab === "inquiry" && (
              <div className="overflow-hidden rounded border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-4">
                  <span className="text-[16px] font-extrabold text-ink">1:1 문의 작성</span>
                  <span className="hidden text-[14px] text-ink-sub sm:block">평일 09:00 ~ 18:00 순차 처리</span>
                </div>

                {submitted ? (
                  <div className="px-8 py-16 text-center">
                    <div className="mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-full border border-green-200 bg-green-50">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="mb-2.5 text-[20px] font-extrabold text-ink">문의가 접수되었습니다</p>
                    <p className="text-[15px] leading-relaxed text-ink-sub">
                      평일 09:00 ~ 18:00 내 순차적으로 답변드리겠습니다.<br />
                      <span className="font-bold text-brand">빠른 상담이 필요하신 경우 전화로 연락주세요.</span>
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => { resetForm(); setTab("history"); }}
                        className="rounded bg-brand px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark"
                      >
                        문의 내역 보기
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded border border-line px-7 py-3 text-[15px] font-bold text-ink transition-colors hover:border-brand hover:text-brand"
                      >
                        새 문의 작성
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-4 sm:p-8">
                    {/* Name + Phone */}
                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[14px] font-bold text-ink">
                          이름<span className="ml-0.5 text-brand">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="홍길동"
                          className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[14px] font-bold text-ink">연락처</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-5">
                      <label className="mb-2 block text-[14px] font-bold text-ink">
                        이메일<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="example@email.com"
                        className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Subject */}
                    <div className="mb-5">
                      <label className="mb-2 block text-[14px] font-bold text-ink">
                        문의 제목<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="문의 제목을 입력해 주세요"
                        className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Message */}
                    <div className="mb-5">
                      <label className="mb-2 block text-[14px] font-bold text-ink">
                        문의 내용<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={8}
                        placeholder={"문의 내용을 자세히 입력해 주세요\n\n· 주문번호 / 상품명 / 수량 등을 함께 기재해 주시면 빠른 처리가 가능합니다."}
                        className="w-full resize-y rounded border border-line bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* 조회 비밀번호 */}
                    <div className="mb-5">
                      <label className="mb-2 block text-[14px] font-bold text-ink">
                        조회 비밀번호 <span className="font-normal text-ink-sub">(선택)</span>
                      </label>
                      <input
                        type="password"
                        value={inquiryPassword}
                        onChange={(e) => setInquiryPassword(e.target.value)}
                        placeholder="답변 확인 시 사용할 비밀번호 (설정 시 본인만 조회 가능)"
                        className="w-full rounded border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Privacy agree */}
                    <div className="mb-5">
                      <div className="flex items-start gap-3 rounded bg-bg px-4 py-4">
                        <input
                          type="checkbox"
                          id="agreePrivacy"
                          checked={agree}
                          onChange={(e) => setAgree(e.target.checked)}
                          className="mt-0.5 h-[16px] w-[16px] flex-shrink-0 cursor-pointer accent-brand"
                        />
                        <label htmlFor="agreePrivacy" className="cursor-pointer text-[14px] leading-relaxed text-ink-sub">
                          <span className="text-brand">개인정보 수집 및 이용</span>에 동의합니다. (필수)<br />
                          수집 항목: 이름, 연락처, 이메일 · 보유 기간: 문의 처리 완료 후 1년
                        </label>
                      </div>
                    </div>

                    {formError && (
                      <p className="mb-4 text-[14px] text-brand">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded bg-brand py-4 text-[17px] font-extrabold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                    >
                      {submitting ? "접수 중…" : "문의 접수하기"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ② FAQ */}
            {tab === "faq" && (
              <div className="overflow-hidden rounded border border-line bg-white">
                <div className="border-b border-line bg-bg px-6 py-4">
                  <span className="text-[16px] font-extrabold text-ink">자주 묻는 질문</span>
                </div>
                {faqs.length === 0 ? (
                  <p className="py-14 text-center text-[15px] text-ink-sub">등록된 FAQ가 없습니다.</p>
                ) : (
                  <div>
                    {faqCategories.map((cat) => (
                      <div key={cat}>
                        {faqCategories.length > 1 && (
                          <div className="border-b border-line bg-bg px-6 py-2.5 text-[13px] font-bold text-ink-sub">
                            {cat}
                          </div>
                        )}
                        {faqs
                          .filter((f) => f.category === cat)
                          .map((faq) => (
                            <div key={faq.id} className="border-b border-line last:border-none">
                              <button
                                type="button"
                                onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
                                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#FAFAFA]"
                              >
                                <span className="flex-1 text-[16px] font-semibold leading-snug text-ink">
                                  Q. {faq.question}
                                </span>
                                <span className="flex-shrink-0 rounded-full border border-brand/20 bg-orange-50 px-3 py-1 text-[12px] font-bold text-brand">
                                  {faq.category}
                                </span>
                                <svg
                                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                                  stroke="#888" strokeWidth="2" strokeLinecap="round"
                                  className={`flex-shrink-0 transition-transform ${openFaqId === faq.id ? "rotate-180" : ""}`}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                              {openFaqId === faq.id && (
                                <div
                                  className="border-t border-line bg-bg px-6 py-5 text-[15px] leading-[1.9] text-ink-sub"
                                  dangerouslySetInnerHTML={{ __html: `A. ${faq.answer}` }}
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ③ 문의 내역 */}
            {tab === "history" && (
              <div className="overflow-hidden rounded border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-4">
                  <span className="text-[16px] font-extrabold text-ink">문의 내역</span>
                  <span className="text-[14px] text-ink-sub">최근 30건</span>
                </div>
                {/* 모바일 — 카드형 */}
                <div className="sm:hidden">
                  {inquiries.length === 0 ? (
                    <p className="py-14 text-center text-[15px] text-ink-sub">문의 내역이 없습니다.</p>
                  ) : (
                    inquiries.map((inq) => {
                      const badge = statusBadge(inq.status);
                      return (
                        <div
                          key={inq.id}
                          onClick={() => openDetail(inq)}
                          className="cursor-pointer border-b border-line px-4 py-4 transition-colors hover:bg-orange-50/50 last:border-none"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 flex-1 min-w-0 text-[14px] font-medium text-ink truncate">
                              {inq.hasPassword && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                                  <rect x="3" y="11" width="18" height="11" rx="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              )}
                              {inq.isPrivate ? "비공개 문의" : inq.subject}
                            </span>
                            <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                              {badge.text}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-sub">
                            <span>{inq.name}</span>
                            <span>·</span>
                            <span>{new Date(inq.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* PC — 테이블형 */}
                <table className="hidden w-full border-collapse sm:table">
                  <thead>
                    <tr>
                      <th className="border-b border-line bg-bg px-4 py-3.5 text-left text-[13px] font-bold text-ink-sub" style={{ width: 60 }}>번호</th>
                      <th className="border-b border-line bg-bg px-4 py-3.5 text-left text-[13px] font-bold text-ink-sub">제목</th>
                      <th className="border-b border-line bg-bg px-4 py-3.5 text-left text-[13px] font-bold text-ink-sub" style={{ width: 96 }}>작성자</th>
                      <th className="border-b border-line bg-bg px-4 py-3.5 text-left text-[13px] font-bold text-ink-sub" style={{ width: 120 }}>상태</th>
                      <th className="border-b border-line bg-bg px-4 py-3.5 text-left text-[13px] font-bold text-ink-sub" style={{ width: 108 }}>작성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-14 text-center text-[15px] text-ink-sub">
                          문의 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      inquiries.map((inq) => {
                        const badge = statusBadge(inq.status);
                        return (
                          <tr
                            key={inq.id}
                            onClick={() => openDetail(inq)}
                            className="cursor-pointer transition-colors hover:bg-orange-50/50"
                          >
                            <td className="border-b border-line px-4 py-4 text-[14px] text-ink-sub">{inq.id}</td>
                            <td className="border-b border-line px-4 py-4 text-[14px] font-medium text-ink">
                              <span className="flex items-center gap-1.5">
                                {inq.hasPassword && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                )}
                                {inq.isPrivate ? "비공개 문의" : inq.subject}
                              </span>
                            </td>
                            <td className="border-b border-line px-4 py-4 text-[14px] text-ink-sub">{inq.name}</td>
                            <td className="border-b border-line px-4 py-4">
                              <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-bold ${badge.cls}`}>
                                {badge.text}
                              </span>
                            </td>
                            <td className="border-b border-line px-4 py-4 text-[14px] text-ink-sub">
                              {new Date(inq.createdAt).toLocaleDateString("ko-KR")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="flex flex-col gap-4">

            {/* 빠른 상담 채널 */}
            <div className="overflow-hidden rounded border border-line bg-white">
              <div className="border-b border-line bg-bg px-4 py-3">
                <span className="text-[15px] font-extrabold text-ink">빠른 상담 채널</span>
              </div>
              {/* Phone */}
              <a
                href="tel:070-0000-0000"
                className="flex items-center gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-[#FAFAFA]"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-ink">전화 상담</p>
                  <p className="mt-0.5 text-[12px] text-ink-sub">070-0000-0000 · 평일 09~18시</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
              {/* Kakao */}
              <div className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-[#FAFAFA]">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-ink">카카오채널 채팅</p>
                  <p className="mt-0.5 text-[12px] text-ink-sub">@제안서박스몰 · 평일 09~18시</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              {/* Email */}
              <a
                href="mailto:blackcopy2@naver.com"
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[#FAFAFA]"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-ink">이메일</p>
                  <p className="mt-0.5 text-[12px] text-ink-sub break-all">blackcopy2@naver.com</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>

            {/* 운영 안내 */}
            <div className="rounded border border-line bg-bg p-4">
              <p className="mb-3 text-[14px] font-extrabold text-ink">운영 안내</p>
              <div className="mb-2 flex justify-between text-[14px]">
                <span className="text-ink-sub">평일</span>
                <span className="font-bold text-ink">09:00 ~ 18:00</span>
              </div>
              <div className="mb-2 flex justify-between text-[14px]">
                <span className="text-ink-sub">점심</span>
                <span className="font-bold text-ink">12:00 ~ 13:00</span>
              </div>
              <div className="mb-2 flex justify-between text-[14px]">
                <span className="text-ink-sub">토·일·공휴일</span>
                <span className="font-bold text-ink">휴무</span>
              </div>
              <hr className="my-3 border-line" />
              <p className="text-[12px] leading-relaxed text-[#AAAAAA]">
                야간·주말 접수 문의는<br />
                다음 영업일 순차 처리됩니다.<br />
                급행 납기는 전화로 연락주세요.
              </p>
            </div>

            {/* 공지사항 — 모바일 숨김 */}
            <div className="hidden lg:block overflow-hidden rounded border border-line bg-white">
              <div className="border-b border-line bg-bg px-4 py-3">
                <span className="text-[15px] font-extrabold text-ink">공지사항</span>
              </div>
              {notices.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-ink-sub">등록된 공지사항이 없습니다.</p>
              ) : (
                notices.slice(0, 5).map((notice) => (
                  <div
                    key={notice.id}
                    className="cursor-pointer border-b border-line px-4 py-3 transition-colors last:border-none hover:bg-[#FAFAFA]"
                  >
                    <p className="mb-1 text-[13px] font-semibold leading-snug text-ink">
                      {notice.isPinned && (
                        <span className="mr-2 inline-block rounded-[2px] border border-brand/30 px-1.5 py-0.5 text-[11px] font-bold text-brand">
                          공지
                        </span>
                      )}
                      {notice.title}
                    </p>
                    <p className="text-[13px] text-[#AAAAAA]">
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── 문의 상세 모달 ── */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeDetail}
        >
          <div
            className="w-full max-w-[600px] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-line bg-bg px-6 py-4">
              <span className="text-[16px] font-extrabold text-ink">문의 상세</span>
              <button onClick={closeDetail} className="text-ink-sub hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              {/* 비밀번호 입력 폼 */}
              {detailTarget.hasPassword && !detailData && (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p className="mb-1 text-[16px] font-bold text-ink">비밀번호 확인</p>
                  <p className="mb-5 text-[14px] text-ink-sub">문의 작성 시 설정한 비밀번호를 입력하세요</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={detailPassword}
                      onChange={(e) => setDetailPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchDetail(detailTarget.id, detailPassword)}
                      placeholder="비밀번호"
                      autoFocus
                      className="flex-1 rounded border border-line px-4 py-2.5 text-[15px] outline-none focus:border-brand"
                    />
                    <button
                      onClick={() => fetchDetail(detailTarget.id, detailPassword)}
                      disabled={detailLoading || !detailPassword}
                      className="rounded bg-brand px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      {detailLoading ? "확인 중…" : "확인"}
                    </button>
                  </div>
                  {detailError && <p className="mt-3 text-[14px] text-brand">{detailError}</p>}
                </div>
              )}

              {/* 비밀번호 없는 경우 로딩 */}
              {!detailTarget.hasPassword && detailLoading && (
                <p className="py-10 text-center text-[15px] text-ink-sub">불러오는 중…</p>
              )}

              {/* 상세 내용 */}
              {detailData && (
                <div>
                  {/* 제목 + 메타 */}
                  <h3 className="text-[18px] font-extrabold text-ink">{detailData.subject}</h3>
                  <p className="mt-1 text-[13px] text-ink-sub">
                    {detailData.name} · {new Date(detailData.createdAt).toLocaleString("ko-KR")}
                  </p>

                  {/* 문의 내용 */}
                  <div className="mt-4 whitespace-pre-wrap rounded border border-line bg-bg p-4 text-[15px] leading-relaxed text-ink">
                    {detailData.message}
                  </div>

                  {/* 답변 */}
                  {detailData.answer ? (
                    <div className="mt-4 flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-4 w-4 rounded-bl border-b-2 border-l-2 border-brand/40" />
                        <div className="w-0.5 flex-1 bg-brand/20" />
                      </div>
                      <div className="flex-1 rounded border border-brand/20 bg-orange-50/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-black text-white">관리자</span>
                          {detailData.answeredAt && (
                            <span className="text-[12px] text-ink-sub">
                              {new Date(detailData.answeredAt).toLocaleString("ko-KR")}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                          {detailData.answer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded border border-line bg-bg px-5 py-4 text-center text-[14px] text-ink-sub">
                      아직 답변이 등록되지 않았습니다. 평일 09:00~18:00 순차 처리됩니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
