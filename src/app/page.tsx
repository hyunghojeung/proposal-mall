import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NoticeBar } from "@/components/NoticeBar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  // CategoryConfig에서 활성 카테고리 + 실제 상품이 있는 것만 표시
  const configs = await prisma.categoryConfig
    .findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
    .catch(() => []);

  // 각 카테고리에 실제 활성 상품이 있는지 확인
  const activeEnumKeys = await prisma.product
    .findMany({ where: { isActive: true }, select: { category: true }, distinct: ["category"] })
    .catch(() => [] as { category: string }[])
    .then((rows) => new Set(rows.map((r) => r.category)));

  const categories = configs
    .filter((c) => activeEnumKeys.has(c.enumKey))
    .map((c) => {
      const customLink = (c as { customLink?: string }).customLink ?? "";
      return {
        title:     c.label,
        desc:      c.description,
        href:      customLink || `/products?cat=${c.slug}`,
        thumbnail: (c as { thumbnail?: string }).thumbnail ?? "",
        badge:     (c as { badge?: string }).badge ?? "",
      };
    });

  return (
    <>
      <NoticeBar />
      <Header />

      <section className="relative flex min-h-[350px] items-center overflow-hidden bg-bg">
        <div className="absolute bottom-0 right-0 w-[58%]" style={{ top: "-200px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-box.png"
            alt="제안서 캐리어박스"
            className="h-full w-full object-cover object-left-top"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #F5F5F5 0%, #F5F5F5 38%, rgba(245,245,245,0.95) 46%, rgba(245,245,245,0.7) 56%, rgba(245,245,245,0.2) 68%, transparent 80%)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-page px-6 py-10">
          <p className="mb-3 text-[15px] font-medium tracking-wide text-brand">
            B2B 제안서 제작 전문
          </p>
          <h1 className="mb-4 break-keep text-[22px] font-black leading-[1.3] tracking-tight text-ink sm:text-[32px] md:text-[44px] md:leading-[1.2]">
            중요한 제안에 어울리는
            <br />
            <span className="text-brand">완성도 있는 제안서</span>를.
          </h1>
          <p className="mb-8 break-keep text-[14px] leading-[1.8] text-ink-sub md:text-[16px] md:leading-[1.9]">
            인쇄, 제본, 박스 제작까지 한 번에.<br className="md:hidden" /> 빠른 제작과 합리적인 가격으로
            <br className="hidden md:block" />
            중요한 비즈니스 순간을 더 돋보이게 만들어 드립니다.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded bg-brand px-7 py-3.5 text-[16px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_6px_20px_rgba(232,72,26,.3)]"
          >
            전체상품 보러가기
            <svg
              width="15"
              height="15"
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

      <section className="bg-white py-18">
        <div className="mx-auto max-w-page px-6">
          <h2 className="mb-2 text-[26px] font-black tracking-tight text-ink">
            카테고리
          </h2>
          <p className="mb-10 text-[15px] text-ink-sub">
            필요하신 제안서 형태를 선택해 주세요
          </p>

          {categories.length === 0 ? (
            <p className="text-[15px] text-ink-sub">등록된 상품이 없습니다.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="group block overflow-hidden rounded-xl border border-line bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,.10)]"
                  >
                    {/* 이미지 영역 */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f0f0f0]">
                      {/* 뱃지 */}
                      {cat.badge && (
                        <span className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[12px] font-black tracking-wide text-white shadow ${
                          cat.badge === "BEST"
                            ? "bg-brand"
                            : cat.badge === "NEW"
                            ? "bg-blue-500"
                            : "bg-[#333]"
                        }`}>
                          {cat.badge}
                        </span>
                      )}

                      {/* 대표 이미지 */}
                      {cat.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cat.thumbnail}
                          alt={cat.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        /* 이미지 없을 때 패턴 배경 */
                        <div className="h-full w-full"
                          style={{
                            backgroundImage: "repeating-linear-gradient(45deg, #e8e8e8 0, #e8e8e8 1px, transparent 0, transparent 50%)",
                            backgroundSize: "12px 12px",
                            backgroundColor: "#f5f5f5",
                          }}
                        />
                      )}

                      {/* 이미지 위 상품명 오버레이 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-4 pt-10">
                        <h3 className="text-[18px] font-black text-white drop-shadow-sm">
                          {cat.title}
                        </h3>
                      </div>
                    </div>

                    {/* 카드 하단 본문 */}
                    <div className="px-5 py-4">
                      <p className="mb-3 text-[14px] leading-relaxed text-ink-sub">
                        {cat.desc || " "}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand">
                        살펴보기
                        <svg
                          width="13"
                          height="13"
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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── 카카오채널 배너 ── */}
      <section style={{ backgroundColor: "#FEE500" }} className="py-12">
        <div className="mx-auto max-w-page px-6">
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">

            {/* 아이콘 + 텍스트 */}
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-5">
              {/* 카카오 말풍선 아이콘 */}
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl bg-black/10">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="#1A1A1A">
                  <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.55 5.08 3.9 6.52-.16.58-.98 3.54-1.01 3.73 0 0-.01.11.06.15.07.04.15.01.15.01.2-.03 3.47-2.27 4.07-2.68.59.08 1.19.13 1.83.13 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
                </svg>
              </div>

              <div>
                <p className="text-[12px] font-bold tracking-widest text-black/40 uppercase">Kakao Channel</p>
                <h3 className="mt-0.5 text-[20px] font-black text-[#1A1A1A] md:text-[22px]">
                  카카오채널로 빠르게 상담하세요
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[#1A1A1A]/70">
                  견적 문의·제작 상담을 채팅으로 빠르게 해결하세요.<br className="hidden md:block" />
                  채널 추가 후 편하게 메시지를 보내주세요. 평일 09:00 ~ 18:00 운영
                </p>
                {/* CTA 버튼 (모바일) */}
                <a
                  href="http://pf.kakao.com/_XxeRTn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-[14px] font-bold text-[#FEE500] transition-colors hover:bg-[#333] md:hidden"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#FEE500">
                    <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.55 5.08 3.9 6.52-.16.58-.98 3.54-1.01 3.73 0 0-.01.11.06.15.07.04.15.01.15.01.2-.03 3.47-2.27 4.07-2.68.59.08 1.19.13 1.83.13 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
                  </svg>
                  카카오채널 상담하기
                </a>
              </div>
            </div>

            {/* QR코드 + CTA 버튼 (PC) */}
            <div className="hidden flex-col items-center gap-3 md:flex">
              <a
                href="http://pf.kakao.com/_XxeRTn"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-2xl bg-white p-3 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kakao-qr.png"
                  alt="카카오채널 QR코드"
                  className="h-[130px] w-[130px] rounded-xl object-contain"
                />
              </a>
              <p className="text-[11px] font-bold text-[#1A1A1A]/50">QR 스캔으로 채널 추가</p>
              <a
                href="http://pf.kakao.com/_XxeRTn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-2.5 text-[14px] font-bold text-[#FEE500] transition-colors hover:bg-[#333]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FEE500">
                  <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.55 5.08 3.9 6.52-.16.58-.98 3.54-1.01 3.73 0 0-.01.11.06.15.07.04.15.01.15.01.2-.03 3.47-2.27 4.07-2.68.59.08 1.19.13 1.83.13 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
                </svg>
                카카오채널 상담하기
              </a>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
