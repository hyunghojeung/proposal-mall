import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-page px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h2 className="text-[22px] font-black italic text-brand">제안서박스몰</h2>
            <p className="mt-3 text-[15px] leading-7 text-ink-sub">
              B2B 제안서 인쇄·제본·박스 전문 쇼핑몰
              <br />
              <a
                href="https://proposal.blackcopy.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                proposal.blackcopy.co.kr
              </a>
            </p>
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div>
                <p className="text-[13px] text-ink-sub">하드커버제본/바인더/북케이스 전문쇼핑몰</p>
                <a
                  href="https://www.blackcopy.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-brand hover:underline"
                >
                  www.blackcopy.co.kr
                </a>
              </div>
              <div>
                <p className="text-[13px] text-ink-sub">하드커버 제품 갤러리</p>
                <a
                  href="https://www.hardcover.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-brand hover:underline"
                >
                  www.hardcover.co.kr
                </a>
              </div>
            </div>
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
            <h3 className="text-[16px] font-bold text-ink">BANK INFO</h3>
            <ul className="mt-3 space-y-1.5 text-[14px] text-ink-sub">
              <li className="font-semibold text-ink">우리은행 예금주: 정형호</li>
              <li>208-08-4262-60</li>
              <li className="pt-1">
                상담:{" "}
                <a href="mailto:blackcopy2@naver.com" className="text-brand hover:underline">
                  blackcopy2@naver.com
                </a>
              </li>
              <li className="pt-1">
                웹하드:{" "}
                <a href="https://webhard.co.kr" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  webhard.co.kr
                </a>
              </li>
              <li>ID: blackcopy / Pass: blackcopy</li>
            </ul>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-ink">사업자 정보</h3>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-sub">
              <li><span className="text-ink-del">상호명</span> &nbsp;인쇄의창</li>
              <li><span className="text-ink-del">대표이사</span> &nbsp;정형호</li>
              <li><span className="text-ink-del">사업자등록번호</span> &nbsp;114-04-56136</li>
              <li><span className="text-ink-del">통신판매업신고</span> &nbsp;2011-서울용산-01204호</li>
              <li><span className="text-ink-del">개인정보취급책임자</span> &nbsp;정형호</li>
              <li className="pt-1"><span className="text-ink-del">주소</span> &nbsp;서울특별시 용산구 한강대로40길 33 성산빌딩 2층</li>
            </ul>
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
