/**
 * POST /api/admin/seed-inquiries
 * 가상 고객문의 데이터 삽입 (기존 전체 삭제 후 재생성)
 * Authorization: Bearer seed-blackcopy-2026
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InquiryStatus } from "@prisma/client";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ── 고객 풀 ── */
const LAST  = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","류","전","홍","남","노","하","고","문","양","손","배","백"];
const FIRST = ["민준","서연","도윤","서현","예준","지우","시우","서윤","주원","하은","지호","민서","준서","하린","지원","수빈","지훈","나은","현우","다은","태윤","채원","승민","유나","정우","소연","현진","보미","진혁","아름","병철","성훈","경민","지영","수현","민정","기훈","영호","재원","혜진"];
const DOMAINS = ["gmail.com","naver.com","kakao.com","daum.net","nate.com","outlook.com","company.co.kr"];
const COMPANIES = ["(주)대한기획","삼성물산","현대건설","LG유플러스","SK텔레콤","롯데제과","CJ제일제당","포스코","한화솔루션","KT&G","신세계그룹","GS칼텍스","두산중공업","한국전력","아모레퍼시픽","넥슨코리아","카카오","네이버","쿠팡","배달의민족","하이브","크래프톤","NC소프트","카카오페이","토스","위메이드","라인"];

function rName()  { return pick(LAST) + pick(FIRST); }
function rPhone() { return `010-${rand(1000,9999)}-${rand(1000,9999)}`; }
function rEmail() { return `user${rand(10,99)}@${pick(DOMAINS)}`; }

/* ── 문의 내용 풀 ── */
const INQUIRY_TEMPLATES = [
  {
    subject: "제안서캐리어박스 납기 문의",
    message: "안녕하세요. 제안서캐리어박스 표준 사이즈 20개 제작 예정인데요, 주문 후 납기가 얼마나 걸리나요? 급하게 필요한 상황이라 빠른 답변 부탁드립니다.",
    answer: "안녕하세요, 문의주셔서 감사합니다. 표준 사이즈 제안서캐리어박스 20개 기준 일반적으로 주문 확인 후 3~5 영업일 이내 출고됩니다. 급하신 경우 별도 협의 후 빠른 제작도 가능하오니 카카오채널로 문의주시면 더 빠르게 안내드리겠습니다."
  },
  {
    subject: "커스텀 박스 로고 인쇄 가능 여부 문의",
    message: "회사 로고가 포함된 커스텀 박스 제작이 가능한가요? 로고 파일은 AI 파일로 제공 가능합니다. 수량은 50개 정도 예정입니다.",
    answer: "네, 회사 로고 포함 커스텀 박스 제작 가능합니다. AI 파일 기준으로 작업하며, 색상 수에 따라 인쇄 방식이 달라집니다. 50개 수량 기준 견적은 카카오채널 또는 이메일로 AI 파일 전송 후 상세 안내드리겠습니다."
  },
  {
    subject: "3공바인더 원단 종류 문의",
    message: "3공바인더 원단형으로 제작하고 싶은데 원단 종류가 어떻게 되나요? 샘플 확인이 가능한지도 궁금합니다.",
    answer: "3공바인더 원단은 PU합성피혁(무광/유광), 패브릭, 패턴원단 등 다양하게 선택 가능합니다. 샘플은 방문 수령 시 현장 확인 가능하며, 택배로도 일부 샘플 제공이 가능합니다. 원하시는 색상과 재질을 알려주시면 맞춤 안내드리겠습니다."
  },
  {
    subject: "하드커버스프링제본 표지 소재 문의",
    message: "하드커버스프링제본 제작 시 표지 소재를 고를 수 있나요? 고급스러운 느낌을 원합니다.",
    answer: "하드커버스프링제본의 표지 소재는 PU가죽, 패브릭, 고급 아트지+코팅 등 다양하게 선택 가능합니다. 고급스러운 느낌을 원하신다면 무광 PU가죽 소재를 추천드립니다. 상세 옵션은 제품 상세 페이지 또는 카카오채널로 문의 부탁드립니다."
  },
  {
    subject: "대량 주문 시 할인 가능한가요?",
    message: "제안서박스 100개 이상 대량 주문 시 추가 할인이 가능한지 문의드립니다. 견적도 별도로 받을 수 있을까요?",
    answer: "네, 100개 이상 대량 주문 시 별도 견적 협의가 가능합니다. 수량과 제품 종류를 카카오채널 또는 이메일(blackcopy2@naver.com)로 알려주시면 맞춤 견적서를 보내드리겠습니다."
  },
  {
    subject: "배송 관련 문의드립니다",
    message: "주문한 제품이 파손되어 도착했습니다. 어떻게 처리해야 하나요?",
    answer: "불편을 드려 대단히 죄송합니다. 수령 시 파손된 경우 제품 사진과 주문번호를 이메일 또는 카카오채널로 보내주시면 즉시 교환 또는 환불 처리해드리겠습니다. 빠르게 조치하겠습니다."
  },
  {
    subject: "자석박스 내부 구성 문의",
    message: "자석박스 내부에 별도 내지나 파티션 구성이 가능한가요? 제안서와 USB를 같이 담을 예정입니다.",
    answer: "자석박스 내부 파티션 및 내지 구성 커스텀 제작 가능합니다. USB 수납 공간, 제안서 고정 리본 등 다양하게 구성할 수 있으며, 견적은 내부 구성 요청 사항을 카카오채널로 알려주시면 안내드리겠습니다."
  },
  {
    subject: "PT용바인더 납기 및 가격 문의",
    message: "PT용바인더 인쇄형 30개 제작하려고 합니다. 가격과 납기 기간이 궁금합니다.",
    answer: "PT용바인더 인쇄형 30개 기준 가격은 상품 상세 페이지의 단가표를 참고해주시고, 납기는 주문 확인 후 3~5 영업일입니다. 정확한 견적은 인쇄 면수와 컬러 여부에 따라 달라지므로 상세 문의 부탁드립니다."
  },
  {
    subject: "파일 제출 방법 문의",
    message: "결제 완료 후 인쇄 파일을 어떻게 전달하면 되나요? PDF로 준비해놨습니다.",
    answer: "결제 완료 후 발송되는 이메일에 Dropbox 업로드 링크가 포함됩니다. PDF 파일을 해당 링크를 통해 업로드해주시면 됩니다. 파일명에 주문번호를 포함해주시면 더욱 빠른 처리가 가능합니다."
  },
  {
    subject: "색상 교정 서비스 제공 여부 문의",
    message: "인쇄 전 색상 교정 샘플을 받아볼 수 있나요? 색상이 중요한 프로젝트라서요.",
    answer: "교정 샘플(품교) 서비스 제공 가능합니다. 별도 비용이 발생할 수 있으며, 소요 시간은 1~2 영업일 추가됩니다. 견적 문의 시 교정 샘플 요청 여부를 함께 알려주시면 안내드리겠습니다."
  },
  {
    subject: "재주문 시 동일 규격으로 가능한지 문의",
    message: "이전에 제작한 제품과 동일한 규격으로 재주문하고 싶습니다. 이전 주문 정보가 남아 있나요?",
    answer: "네, 이전 주문 정보는 시스템에 보관되어 있습니다. 주문번호 또는 제품명을 카카오채널 또는 이메일로 알려주시면 동일 규격으로 재주문 처리해드리겠습니다."
  },
  {
    subject: "직접 방문 수령 가능한지 문의",
    message: "서울 용산에 있다고 들었는데, 직접 방문해서 제품을 수령할 수 있나요?",
    answer: "네, 직접 방문 수령 가능합니다. 주소는 서울특별시 용산구 한강대로40길 33 성산빌딩 2층입니다. 방문 전 카카오채널로 방문 일정을 미리 알려주시면 더욱 원활하게 수령하실 수 있습니다. 영업시간은 평일 09:00~18:00입니다."
  },
  {
    subject: "인쇄 해상도 및 파일 규격 문의",
    message: "인쇄용 파일을 만들려고 하는데 해상도와 규격이 어떻게 되나요?",
    answer: "인쇄용 파일은 PDF 또는 AI 형식, 해상도 300dpi 이상을 권장드립니다. 도련(재단 여분)은 상하좌우 3mm 포함해주시고, CMYK 색상 모드로 저장해주시면 가장 좋습니다. 추가 문의는 카카오채널로 연락주세요."
  },
  {
    subject: "제안서박스 사이즈 문의",
    message: "A4 사이즈 제안서 100페이지 분량이 들어가는 박스 사이즈가 어떻게 되나요?",
    answer: "A4 100페이지 기준 표준 제안서캐리어박스 사이즈로 충분히 수납 가능합니다. 정확한 내부 사이즈는 상품 상세 페이지에서 확인하실 수 있으며, 제본 방식에 따라 두께가 달라질 수 있으니 제본 방식도 함께 알려주시면 더 정확하게 안내드리겠습니다."
  },
  {
    subject: "결제 방법 문의",
    message: "무통장 입금 외에 다른 결제 방법이 있나요? 법인카드로 결제하고 싶습니다.",
    answer: "네, 법인카드 포함 신용카드 결제 가능합니다. 결제 페이지에서 카드 결제를 선택하시면 됩니다. 세금계산서 발행이 필요하신 경우 주문 시 사업자 정보를 함께 알려주시면 처리해드리겠습니다."
  },
  {
    subject: "세금계산서 발행 가능 여부",
    message: "주문 후 세금계산서 발행이 가능한가요? 사업자 번호로 발행 요청드립니다.",
    answer: "네, 세금계산서 발행 가능합니다. 주문 시 메모란에 사업자등록번호, 상호명, 담당자 이메일을 기재해주시거나 카카오채널로 알려주시면 결제 완료 후 발행해드리겠습니다."
  },
  {
    subject: "박스 내부 로고 스티커 부착 서비스",
    message: "박스 내부에 회사 로고 스티커를 부착하는 서비스도 제공하시나요?",
    answer: "네, 박스 내부 로고 스티커 부착 서비스 제공 가능합니다. 스티커 제작 포함 또는 고객사 제공 스티커 부착 모두 가능하니, 원하시는 방식을 카카오채널로 알려주시면 견적 안내드리겠습니다."
  },
  {
    subject: "급행 제작 서비스 가능 여부",
    message: "이틀 안에 제작 완료가 가능한가요? 급하게 필요한 상황입니다.",
    answer: "제품 종류와 수량에 따라 급행 제작 가능 여부가 다릅니다. 가능한 경우 추가 비용이 발생할 수 있습니다. 카카오채널로 제품 종류, 수량, 희망 수령일을 알려주시면 가능 여부를 빠르게 확인해드리겠습니다."
  },
  {
    subject: "반품 및 교환 정책 문의",
    message: "제품 수령 후 불량이 있으면 교환이 가능한가요?",
    answer: "네, 제품 불량의 경우 수령 후 3일 이내 사진과 함께 연락주시면 교환 또는 환불 처리해드립니다. 단, 고객 변심에 의한 반품은 인쇄·제본 제품 특성상 불가한 점 양해 부탁드립니다."
  },
  {
    subject: "바인더 링 사이즈 선택 가능한지 문의",
    message: "3공바인더 링 사이즈를 선택할 수 있나요? 두꺼운 제안서용으로 큰 링이 필요합니다.",
    answer: "3공바인더 링 사이즈는 25mm, 38mm, 50mm 중 선택 가능합니다. 두꺼운 제안서의 경우 50mm 링을 추천드립니다. 주문 시 원하시는 링 사이즈를 메모란에 기재해주세요."
  },
];

/* ── 날짜 생성 ── */
function monthDates(year: number, month: number, count: number): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const step = Math.floor(daysInMonth / count);
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = i * step + 1;
    days.push(rand(base, Math.min(base + step - 1, daysInMonth)));
  }
  return Array.from(new Set(days)).sort((a, b) => a - b)
    .map(d => new Date(year, month - 1, d, rand(9, 21), rand(0, 59)))
    .filter(dt => dt <= today)
    .slice(0, count);
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== "Bearer seed-blackcopy-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.inquiry.deleteMany({});

    const YEAR = 2026;
    const endMonth = new Date().getMonth() + 1;
    const results: string[] = [];

    for (let m = 1; m <= endMonth; m++) {
      const dates = monthDates(YEAR, m, 15);
      for (const date of dates) {
        const tmpl   = pick(INQUIRY_TEMPLATES);
        const name   = rName();
        const company = Math.random() > 0.5 ? pick(COMPANIES) : undefined;

        const answeredAt = new Date(date.getTime() + rand(1, 24) * 3600 * 1000);

        await prisma.inquiry.create({
          data: {
            name,
            email:     rEmail(),
            phone:     rPhone(),
            subject:   tmpl.subject,
            message:   tmpl.message,
            isPrivate: Math.random() > 0.8,
            status:    InquiryStatus.ANSWERED,
            answer:    tmpl.answer,
            answeredAt,
            createdAt: date,
          },
        });
        results.push(`${date.toLocaleDateString("ko-KR")} | ${name}${company ? ` (${company})` : ""} | ${tmpl.subject}`);
      }
    }

    return NextResponse.json({ ok: true, count: results.length, inquiries: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
