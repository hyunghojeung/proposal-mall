"use client";

import { useState, useEffect } from "react";

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
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  answeredAt: string | null;
}

export function ContactView() {
  const [tab, setTab] = useState<Tab>("inquiry");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        body: JSON.stringify({ name, phone, email, subject, message }),
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
    setAgree(false); setSubmitted(false); setFormError(null);
  }

  // Unique categories in order
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
      <div className="border-b border-line bg-white pt-10 pb-0 text-center">
        <h1 className="text-[26px] font-black tracking-tight text-ink">고객문의</h1>

        {/* Tabs */}
        <div className="mt-5 flex justify-center">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-7 py-3.5 text-[14px] font-bold transition-all ${
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
      <div className="mx-auto max-w-page px-6 pb-20 pt-9">
        {/* Two-column grid */}
        <div className="grid grid-cols-[1fr_340px] items-start gap-6">

          {/* ── Left column ── */}
          <div>

            {/* ① 1:1 문의 */}
            {tab === "inquiry" && (
              <div className="overflow-hidden rounded border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3.5">
                  <span className="text-[14px] font-extrabold text-ink">1:1 문의 작성</span>
                  <span className="text-[12px] text-ink-sub">평일 09:00 ~ 18:00 순차 처리</span>
                </div>

                {submitted ? (
                  /* Success state */
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-green-200 bg-green-50">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="mb-2 text-[16px] font-extrabold text-ink">문의가 접수되었습니다</p>
                    <p className="text-[13.5px] leading-relaxed text-ink-sub">
                      평일 09:00 ~ 18:00 내 순차적으로 답변드리겠습니다.<br />
                      <span className="font-bold text-brand">빠른 상담이 필요하신 경우 전화로 연락주세요.</span>
                    </p>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="mt-5 rounded border border-line px-6 py-2.5 text-[13px] font-bold text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      새 문의 작성
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="p-6">
                    {/* Name + Phone */}
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-[12.5px] font-bold text-ink">
                          이름<span className="ml-0.5 text-brand">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="홍길동"
                          className="w-full rounded border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12.5px] font-bold text-ink">연락처</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="010-0000-0000"
                          className="w-full rounded border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                      <label className="mb-2 block text-[12.5px] font-bold text-ink">
                        이메일<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="example@email.com"
                        className="w-full rounded border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Subject */}
                    <div className="mb-4">
                      <label className="mb-2 block text-[12.5px] font-bold text-ink">
                        문의 제목<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="문의 제목을 입력해 주세요"
                        className="w-full rounded border border-line bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Message */}
                    <div className="mb-4">
                      <label className="mb-2 block text-[12.5px] font-bold text-ink">
                        문의 내용<span className="ml-0.5 text-brand">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={7}
                        placeholder={"문의 내용을 자세히 입력해 주세요\n\n· 주문번호 / 상품명 / 수량 등을 함께 기재해 주시면 빠른 처리가 가능합니다."}
                        className="w-full resize-y rounded border border-line bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-ink outline-none transition-colors placeholder:text-[#AAAAAA] focus:border-brand"
                      />
                    </div>

                    {/* Privacy agree */}
                    <div className="mb-4">
                      <div className="flex items-start gap-2.5 rounded bg-bg p-3.5">
                        <input
                          type="checkbox"
                          id="agreePrivacy"
                          checked={agree}
                          onChange={(e) => setAgree(e.target.checked)}
                          className="mt-0.5 h-[15px] w-[15px] flex-shrink-0 cursor-pointer accent-brand"
                        />
                        <label htmlFor="agreePrivacy" className="cursor-pointer text-[12.5px] leading-relaxed text-ink-sub">
                          <span className="text-brand">개인정보 수집 및 이용</span>에 동의합니다. (필수)<br />
                          수집 항목: 이름, 연락처, 이메일 · 보유 기간: 문의 처리 완료 후 1년
                        </label>
                      </div>
                    </div>

                    {formError && (
                      <p className="mb-3 text-[13px] text-brand">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded bg-brand py-3.5 text-[15px] font-extrabold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
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
                <div className="border-b border-line bg-bg px-5 py-3.5">
                  <span className="text-[14px] font-extrabold text-ink">자주 묻는 질문</span>
                </div>
                {faqs.length === 0 ? (
                  <p className="py-12 text-center text-[13.5px] text-ink-sub">등록된 FAQ가 없습니다.</p>
                ) : (
                  <div>
                    {faqCategories.map((cat) => (
                      <div key={cat}>
                        {faqCategories.length > 1 && (
                          <div className="border-b border-line bg-bg px-5 py-2 text-[12px] font-bold text-ink-sub">
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
                                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#FAFAFA]"
                              >
                                <span className="flex-1 text-[13.5px] font-semibold leading-snug text-ink">
                                  Q. {faq.question}
                                </span>
                                <span className="flex-shrink-0 rounded-full border border-brand/20 bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                                  {faq.category}
                                </span>
                                <svg
                                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                                  stroke="#888" strokeWidth="2" strokeLinecap="round"
                                  className={`flex-shrink-0 transition-transform ${openFaqId === faq.id ? "rotate-180" : ""}`}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                              {openFaqId === faq.id && (
                                <div
                                  className="border-t border-line bg-bg px-5 py-4 text-[13px] leading-[1.85] text-ink-sub"
                                  /* FAQ answers are admin-entered content */
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
                <div className="flex items-center justify-between border-b border-line bg-bg px-5 py-3.5">
                  <span className="text-[14px] font-extrabold text-ink">문의 내역</span>
                  <span className="text-[12px] text-ink-sub">최근 30건</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b border-line bg-bg px-3.5 py-3 text-left text-[12px] font-bold text-ink-sub" style={{ width: 56 }}>번호</th>
                      <th className="border-b border-line bg-bg px-3.5 py-3 text-left text-[12px] font-bold text-ink-sub">제목</th>
                      <th className="border-b border-line bg-bg px-3.5 py-3 text-left text-[12px] font-bold text-ink-sub" style={{ width: 88 }}>작성자</th>
                      <th className="border-b border-line bg-bg px-3.5 py-3 text-left text-[12px] font-bold text-ink-sub" style={{ width: 84 }}>상태</th>
                      <th className="border-b border-line bg-bg px-3.5 py-3 text-left text-[12px] font-bold text-ink-sub" style={{ width: 100 }}>작성일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[13.5px] text-ink-sub">
                          문의 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      inquiries.map((inq) => {
                        const badge = statusBadge(inq.status);
                        return (
                          <tr key={inq.id} className="transition-colors hover:bg-[#FAFAFA]">
                            <td className="border-b border-line px-3.5 py-3.5 text-[13px] text-ink-sub">{inq.id}</td>
                            <td className="border-b border-line px-3.5 py-3.5 text-[13px] font-medium text-ink">
                              {inq.isPrivate ? (
                                <span className="flex items-center gap-1.5 text-ink-sub">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                  비공개 문의
                                </span>
                              ) : (
                                inq.subject
                              )}
                            </td>
                            <td className="border-b border-line px-3.5 py-3.5 text-[13px] text-ink-sub">{inq.name}</td>
                            <td className="border-b border-line px-3.5 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                                {badge.text}
                              </span>
                            </td>
                            <td className="border-b border-line px-3.5 py-3.5 text-[13px] text-ink-sub">
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
          <div className="flex flex-col gap-3.5">

            {/* 빠른 상담 채널 */}
            <div className="overflow-hidden rounded border border-line bg-white">
              <div className="border-b border-line bg-bg px-5 py-3.5">
                <span className="text-[14px] font-extrabold text-ink">빠른 상담 채널</span>
              </div>
              {/* Phone */}
              <a
                href="tel:070-0000-0000"
                className="flex items-center gap-3.5 border-b border-line px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-bold text-ink">전화 상담</p>
                  <p className="text-[12px] text-ink-sub">070-0000-0000 · 평일 09~18시</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
              {/* Kakao */}
              <div className="flex cursor-pointer items-center gap-3.5 border-b border-line px-5 py-4 transition-colors hover:bg-[#FAFAFA]">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-bold text-ink">카카오채널 채팅</p>
                  <p className="text-[12px] text-ink-sub">@제안서박스몰 · 평일 09~18시</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              {/* Email */}
              <a
                href="mailto:blackcopy2@naver.com"
                className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-line bg-bg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-bold text-ink">이메일</p>
                  <p className="text-[12px] text-ink-sub">blackcopy2@naver.com</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>

            {/* 운영 안내 */}
            <div className="rounded border border-line bg-bg p-5">
              <p className="mb-3.5 text-[13px] font-extrabold text-ink">운영 안내</p>
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-ink-sub">평일</span>
                <span className="font-bold text-ink">09:00 ~ 18:00</span>
              </div>
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-ink-sub">점심</span>
                <span className="font-bold text-ink">12:00 ~ 13:00</span>
              </div>
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-ink-sub">토 · 일 · 공휴일</span>
                <span className="font-bold text-ink">휴무</span>
              </div>
              <hr className="my-3 border-line" />
              <p className="text-[12px] leading-relaxed text-[#AAAAAA]">
                야간·주말에 접수된 문의는<br />
                다음 영업일 순차 처리됩니다.<br />
                급행 납기 문의는 전화로 연락주세요.
              </p>
            </div>

            {/* 공지사항 */}
            <div className="overflow-hidden rounded border border-line bg-white">
              <div className="border-b border-line bg-bg px-5 py-3.5">
                <span className="text-[14px] font-extrabold text-ink">공지사항</span>
              </div>
              {notices.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-sub">등록된 공지사항이 없습니다.</p>
              ) : (
                notices.slice(0, 5).map((notice) => (
                  <div
                    key={notice.id}
                    className="cursor-pointer border-b border-line px-5 py-3.5 transition-colors last:border-none hover:bg-[#FAFAFA]"
                  >
                    <p className="mb-1 text-[13px] font-semibold leading-snug text-ink">
                      {notice.isPinned && (
                        <span className="mr-1.5 inline-block rounded-[2px] border border-brand/30 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                          공지
                        </span>
                      )}
                      {notice.title}
                    </p>
                    <p className="text-[11.5px] text-[#AAAAAA]">
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
