import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 결제 어댑터 진단 엔드포인트
// GET /api/payment/debug → 어댑터 상태 + Ciderpay API 테스트 결과 반환
export async function GET() {
  const apiKey    = process.env.CIDERPAY_API_KEY;
  const devId     = process.env.CIDERPAY_DEV_ID;
  const devToken  = process.env.CIDERPAY_DEV_TOKEN;
  const mid       = process.env.CIDERPAY_MID ?? "1140456136";
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL;

  const adapter =
    apiKey || (devId && devToken) ? "ciderpay" : "stub";

  const envStatus = {
    adapter,
    CIDERPAY_API_KEY:    apiKey   ? `${apiKey.slice(0, 8)}…` : "❌ 미설정",
    CIDERPAY_DEV_ID:     devId    ? `${devId.slice(0, 4)}…`  : "❌ 미설정",
    CIDERPAY_DEV_TOKEN:  devToken ? `${devToken.slice(0, 4)}…` : "❌ 미설정",
    CIDERPAY_MID:        mid,
    NEXT_PUBLIC_SITE_URL: siteUrl ?? "❌ 미설정",
  };

  if (adapter === "stub") {
    return NextResponse.json({ ...envStatus, ciderpayTest: "SKIPPED (stub mode)" });
  }

  // Ciderpay API 테스트: 실제 결제 요청 없이 간단한 결제 요청 시도
  // (실패하더라도 오류 메시지로 진단 가능)
  const token = apiKey!;
  const BASE  = "https://api.ciderpay.com";

  type CiderTestResult =
    | { ok: true;  status: number; body: unknown }
    | { ok: false; status: number; error: string };

  let ciderpayTest: CiderTestResult;
  try {
    const testData = {
      memberID:    mid,
      price:       1000,
      goodName:    "테스트상품",
      mobile:      "01012345678",
      customName:  "테스트",
      email:       "test@test.com",
      feedbackurl: "https://example.com/callback",
      returnurl:   "https://example.com/return",
      returnmode:  "JUST",
      var1:        "DEBUG-TEST-001",
      var2:        "PROPOSAL_MALL",
      smsuse:      "N",
      whereFrom:   "PROPOSAL_MALL_WEBSITE",
      sellerMemo:  "디버그 테스트",
      makeQr:      "false",
      charSet:     "UTF-8",
      goods: [{ goodName: "테스트상품", goodPrice: 1000, useTax: true }],
    };

    const res = await fetch(`${BASE}/oapi/payment/request/s2`, {
      method: "POST",
      headers: {
        "accept":           "application/json",
        "Content-Type":     "application/json",
        "approvalToken":    token,
        "Authorization":    `Bearer ${token}`,
        "X-API-Key":        token,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(testData),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const body = await res.json().catch(() => null);
    ciderpayTest = { ok: res.ok, status: res.status, body };
  } catch (e) {
    ciderpayTest = {
      ok:     false,
      status: 0,
      error:  e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json({ ...envStatus, ciderpayTest });
}
