import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-bg">
      <div className="mx-auto max-w-page px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-[22px] font-black italic text-brand">제안서박스몰</h2>
            <p className="mt-3 text-[15px] leading-7 text-ink-sub">
              B2B 제안서 인쇄·제본·박스 전문 쇼핑몰
              <br />
              proposal.blackcopy.co.kr
            </p>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-ink">고객지원</h3>
            <ul className="mt-3 space-y-2.5 text-[15px] text-ink-sub">
              <li>
                <Link href="/contact?tab=history" className="hover:text-brand">
                  1:1 문의
                </Link>
              </li>
              <li>
                <Link href="/contact?tab=faq" className="hover:text-brand">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="/notices" className="hover:text-brand">
                  공지사항
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-ink">파일 접수</h3>
            <p className="mt-3 text-[15px] leading-7 text-ink-sub">
              결제 완료 후 Dropbox 링크를 통해 파일을 전달해 주세요.
              <br />
              이메일:{" "}
              <a
                href="mailto:blackcopy2@naver.com"
                className="text-brand hover:underline"
              >
                blackcopy2@naver.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-[13px] text-ink-del">
          <Link href="/admin" className="transition-colors hover:text-ink-sub">
            © {new Date().getFullYear()} 블랙카피
          </Link>{" "}
          · 제안서박스몰. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
