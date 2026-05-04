import { PrismaClient, ProductCategory, BindingType, PaperType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding 제안서몰 …");

  // ── 1. 상품 ────────────────────────────────
  const products = [
    {
      slug: "carrier-box",
      name: "제안서캐리어박스",
      category: ProductCategory.CARRIER_BOX,
      description: "튼튼한 손잡이와 깔끔한 외형의 B2B 캐리어 박스. A4/A3 사이즈 지원.",
      sortOrder: 1,
      options: [
        { name: "사이즈", values: ["A4", "A3"] },
        { name: "컬러", values: ["화이트", "블랙"] },
      ],
    },
    {
      slug: "magnetic-box",
      name: "자석박스",
      category: ProductCategory.MAGNETIC_BOX,
      description: "고급스러운 마감의 자석 잠금 케이스. 중요한 제안서를 임팩트 있게.",
      sortOrder: 2,
      options: [
        { name: "사이즈", values: ["A4", "A3"] },
        { name: "마감", values: ["무광", "유광"] },
      ],
    },
    {
      slug: "binding-3-ring",
      name: "3공바인더",
      category: ProductCategory.BINDING_3_RING,
      binding: BindingType.PRINTED,
      description: "100쪽 이상의 두꺼운 제안서에 적합. 인쇄형/원단형 선택.",
      sortOrder: 3,
      options: [
        { name: "형태", values: ["인쇄형", "원단형"] },
        { name: "사이즈", values: ["A4", "B5"] },
      ],
    },
    {
      slug: "binding-pt",
      name: "PT용바인더",
      category: ProductCategory.BINDING_PT,
      binding: BindingType.PRINTED,
      description: "프레젠테이션용 슬림 바인더. 깔끔한 첫인상을 위한 선택.",
      sortOrder: 4,
      options: [
        { name: "형태", values: ["인쇄형", "원단형"] },
        { name: "사이즈", values: ["A4", "A5"] },
      ],
    },
    {
      slug: "binding-hardcover",
      name: "하드커버스프링제본",
      category: ProductCategory.BINDING_HARDCOVER,
      binding: BindingType.PRINTED,
      description: "고급 하드커버 + 스프링 제본. 격식 있는 제안에 어울립니다.",
      sortOrder: 5,
      options: [
        { name: "형태", values: ["인쇄형", "원단형"] },
        { name: "사이즈", values: ["A4"] },
      ],
    },
    {
      slug: "paper-inner",
      name: "내지 인쇄",
      category: ProductCategory.PAPER_INNER,
      paper: PaperType.MOJO,
      description: "5종 용지 선택 가능: 모조지 / 스노우지 / 아트지 / 수입지 / 질감용지.",
      sortOrder: 6,
      options: [
        {
          name: "용지",
          values: ["모조지", "스노우지", "아트지", "수입지", "질감용지"],
        },
      ],
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        category: p.category,
        binding: p.binding ?? BindingType.NONE,
        paper: p.paper ?? PaperType.NONE,
        description: p.description,
        sortOrder: p.sortOrder,
      },
      update: {
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
      },
    });

    // 옵션 그룹은 매번 재생성
    await prisma.optionGroup.deleteMany({ where: { productId: product.id } });
    for (let gi = 0; gi < p.options.length; gi++) {
      const og = p.options[gi];
      await prisma.optionGroup.create({
        data: {
          productId: product.id,
          name: og.name,
          required: true,
          sortOrder: gi,
          values: {
            create: og.values.map((label, vi) => ({
              label,
              priceDelta: 0,
              sortOrder: vi,
            })),
          },
        },
      });
    }
    console.log(`  • ${p.name} (${product.slug}) 등록`);
  }

  // ── 2. 단가표: 내지 (페이지/구간) ─────────
  const paperUnits: Record<PaperType, [number, number, number, number]> = {
    [PaperType.MOJO]: [25, 22, 18, 15],
    [PaperType.SNOW]: [40, 35, 30, 25],
    [PaperType.ART]: [55, 48, 42, 35],
    [PaperType.IMPORT]: [120, 105, 90, 75],
    [PaperType.TEXTURE]: [180, 160, 140, 120],
    [PaperType.NONE]: [0, 0, 0, 0],
  };
  const tiers = ["1", "2-4", "5-9", "10+"] as const;
  const pageBuckets = [50, 100, 200];

  await prisma.pricePaper.deleteMany({});
  for (const [paper, prices] of Object.entries(paperUnits)) {
    if (paper === PaperType.NONE) continue;
    for (const pageCount of pageBuckets) {
      for (let t = 0; t < tiers.length; t++) {
        await prisma.pricePaper.create({
          data: {
            paper: paper as PaperType,
            qtyTier: tiers[t],
            pageCount,
            unitPrice: prices[t] * pageCount,
          },
        });
      }
    }
  }
  console.log(`  • 내지 단가표 ${Object.keys(paperUnits).length - 1}종 × ${pageBuckets.length}구간 × ${tiers.length}수량`);

  // ── 3. 단가표: 제본 (제본형태 × 변종 × 구간) ─
  const bindingPrices: Record<string, [number, number, number, number]> = {
    "PRINTED:인쇄형": [8000, 7000, 6000, 5000],
    "PRINTED:원단형": [15000, 13000, 11000, 9000],
    "FABRIC:원단형": [18000, 16000, 14000, 12000],
  };

  await prisma.priceBinding.deleteMany({});
  for (const [key, prices] of Object.entries(bindingPrices)) {
    const [binding, variant] = key.split(":") as [BindingType, string];
    for (let t = 0; t < tiers.length; t++) {
      await prisma.priceBinding.create({
        data: { binding, variant, qtyTier: tiers[t], unitPrice: prices[t] },
      });
    }
  }
  console.log(`  • 제본 단가표 ${Object.keys(bindingPrices).length}종 × ${tiers.length}수량`);

  // ── 4. 단가표: 박스 (카테고리 × 사이즈 × 구간) ──
  const boxPrices: Record<string, [number, number, number, number]> = {
    "CARRIER_BOX:A4": [12000, 10000, 8500, 7000],
    "CARRIER_BOX:A3": [16000, 14000, 12000, 10000],
    "MAGNETIC_BOX:A4": [18000, 15500, 13500, 11500],
    "MAGNETIC_BOX:A3": [25000, 22000, 19000, 16500],
  };

  await prisma.priceBox.deleteMany({});
  for (const [key, prices] of Object.entries(boxPrices)) {
    const [category, variant] = key.split(":") as [ProductCategory, string];
    for (let t = 0; t < tiers.length; t++) {
      await prisma.priceBox.create({
        data: { category, variant, qtyTier: tiers[t], unitPrice: prices[t] },
      });
    }
  }
  console.log(`  • 박스 단가표 ${Object.keys(boxPrices).length}종 × ${tiers.length}수량`);

  // ── 5. FAQ ────────────────────────────────
  const faqs = [
    { category: "주문", question: "최소 주문 수량이 있나요?", answer: "1부부터 주문 가능합니다. 다만 수량 구간(1 / 2-4 / 5-9 / 10+)에 따라 단가가 달라집니다." },
    { category: "주문", question: "주문 후 취소·변경이 가능한가요?", answer: "결제 직후~제작 전까지 가능합니다. 제작 시작 후에는 취소가 어려우니 1:1 문의로 연락 주세요." },
    { category: "결제", question: "어떤 결제 수단을 지원하나요?", answer: "사이다페이를 통해 신용카드/계좌이체/가상계좌를 지원합니다. 세금계산서가 필요하시면 메모란에 기재해 주세요." },
    { category: "결제", question: "세금계산서 발행이 가능한가요?", answer: "가능합니다. 결제 시 사업자등록번호와 이메일을 메모에 남겨 주시면 발행해 드립니다." },
    { category: "배송", question: "배송비는 얼마인가요?", answer: "택배 배송 2,500원, 30,000원 이상 주문 시 무료배송입니다. 직접 방문 수령은 무료입니다." },
    { category: "배송", question: "직접 수령이 가능한가요?", answer: "가능합니다. 주문 시 '직접 방문 수령'을 선택하시면 배송비가 면제됩니다. 픽업 가능 시간은 평일 09:00~18:00입니다." },
    { category: "제작", question: "제작 기간은 얼마나 걸리나요?", answer: "통상 2~3 영업일이며, 수량과 옵션에 따라 최대 5 영업일이 소요될 수 있습니다." },
    { category: "제작", question: "파일은 어떻게 전달하나요?", answer: "결제 완료 후 안내드리는 Dropbox 링크에 업로드해 주세요. 또는 blackcopy2@naver.com 으로 첨부해 주셔도 됩니다." },
    { category: "제작", question: "어떤 파일 형식을 지원하나요?", answer: "PDF, AI, PSD를 권장합니다. 내지 인쇄는 300dpi 이상 PDF가 가장 안정적입니다." },
    { category: "기타", question: "샘플을 받아볼 수 있나요?", answer: "네, 1:1 문의로 회사명/주소를 남겨 주시면 카탈로그와 샘플 키트를 발송해 드립니다 (무료)." },
  ];

  await prisma.faq.deleteMany({});
  for (let i = 0; i < faqs.length; i++) {
    await prisma.faq.create({ data: { ...faqs[i], sortOrder: i } });
  }
  console.log(`  • FAQ ${faqs.length}건`);

  // ── 6. 공지사항 ───────────────────────────
  await prisma.notice.deleteMany({});
  await prisma.notice.create({
    data: {
      title: "제안서몰 오픈 — 신규 가입 5% 할인 EVENT",
      content:
        "안녕하세요, 제안서몰입니다. 오픈을 기념하여 첫 주문 시 5% 자동 할인이 적용됩니다.\n인쇄·제본·박스 모든 카테고리에 적용되며, 다른 쿠폰과 중복 사용이 가능합니다.",
      isPinned: true,
    },
  });
  console.log(`  • 공지사항 1건 (고정)`);

  console.log("✅ Seed 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
