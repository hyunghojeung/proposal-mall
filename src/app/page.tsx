import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";

const CATEGORIES = [
  {
    title: "제안서캐리어박스",
    desc: "튼튼한 손잡이 + 깔끔한 외형의 B2B 캐리어 박스",
    href: "/products?cat=carrier-box",
  },
  {
    title: "자석박스",
    desc: "고급스러운 마감의 자석 잠금 케이스",
    href: "/products?cat=magnetic-box",
  },
  {
    title: "3공바인더",
    desc: "인쇄형 / 원단형 — 100쪽 이상의 두꺼운 제안서에 적합",
    href: "/products?cat=binding-3-ring",
  },
  {
    title: "PT용바인더",
    desc: "프레젠테이션용 슬림 바인더 — 인쇄형 / 원단형",
    href: "/products?cat=binding-pt",
  },
  {
    title: "하드커버 스프링제본",
    desc: "고급 하드커버 + 스프링 — 인쇄형 / 원단형",
    href: "/products?cat=binding-hardcover",
  },
  {
    title: "내지 인쇄",
    desc: "모조지 / 스노우지 / 아트지 / 수입지 / 질감용지",
    href: "/products?cat=paper-inner",
  },
];

export default function Home() {
  return (
    <>
      <NoticeBar />
      <Header />

      <section className="relative flex min-h-[480px] items-center overflow-hidden bg-bg">
        {/* 히어로 이미지 — 200px 위로 이동 */}
        <div className="absolute bottom-0 right-0 w-[58%]" style={{ top: "-200px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-box.png"
            alt="제안서 캐리어박스"
            className="h-full w-full object-cover object-left-top"
          />
        </div>
        {/* 텍스트 가독성 + 이미지 경계 블렌딩 — 이미지 시작점(42%)을 완전히 덮고 서서히 페이드 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #F5F5F5 0%, #F5F5F5 38%, rgba(245,245,245,0.95) 46%, rgba(245,245,245,0.7) 56%, rgba(245,245,245,0.2) 68%, transparent 80%)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-page px-6 py-20">
          <p className="mb-3 text-[13px] font-medium tracking-wide text-brand">
            B2B 제안서 제작 전문
          </p>
          <h1 className="mb-3.5 text-[42px] font-black leading-[1.2] tracking-tight text-ink">
            중요한 제안에 어울리는
            <br />
            <span className="text-brand">완성도 있는 제안서</span>를.
          </h1>
          <p className="mb-7 text-[14px] leading-[1.9] text-ink-sub">
            인쇄, 제본, 박스 제작까지 한 번에. 빠른 제작과 합리적인 가격으로
            <br />
            중요한 비즈니스 순간을 더 돋보이게 만들어 드립니다.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-6 py-3 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_6px_20px_rgba(232,72,26,.3)]"
          >
            전체상품 보러가기
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-page px-6">
          <h2 className="mb-2 text-[22px] font-black tracking-tight text-ink">
            카테고리
          </h2>
          <p className="mb-10 text-[13px] text-ink-sub">
            필요하신 제안서 형태를 선택해 주세요
          </p>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <li key={cat.title}>
                <Link
                  href={cat.href}
                  className="group block rounded border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_8px_24px_rgba(0,0,0,.06)]"
                >
                  <h3 className="mb-2 text-[16px] font-bold text-ink group-hover:text-brand">
                    {cat.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-ink-sub">
                    {cat.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-brand">
                    살펴보기
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </>
  );
}
