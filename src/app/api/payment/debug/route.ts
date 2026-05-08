import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function tryFetch(apiKey: string, mid: string): Promise<{ attempts: number; result: unknown }> {
  const MAX = 3;
  let lastErr: unknown;
  for (let i = 0; i < MAX; i++) {
    try {
      const r = await fetch("https://api.ciderpay.com/oapi/payment/request/s2", {
        method: "POST",
        headers: {
          accept:             "application/json",
          "Content-Type":     "application/json",
          approvalToken:      apiKey,
          Authorization:      `Bearer ${apiKey}`,
          "X-API-Key":        apiKey,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          memberID: mid, price: 100, goodName: "test",
          mobile: "01012345678", customName: "test", email: "t@t.com",
          feedbackurl: "https://example.com/cb",
          returnurl:   "https://example.com/ret",
          returnmode: "JUST", var1: "DEBUG-001", var2: "TEST",
          smsuse: "N", whereFrom: "TEST", sellerMemo: "test",
          makeQr: "false", charSet: "UTF-8",
          goods: [{ goodName: "test", goodPrice: 100, useTax: true }],
        }),
      });
      const body = await r.json().catch(() => "(non-JSON)");
      return { attempts: i + 1, result: { httpStatus: r.status, ok: r.ok, body } };
    } catch (e) {
      lastErr = e;
      const msg = String(e);
      const retryable = msg.includes("EAI_AGAIN") || msg.includes("ECONNRESET");
      if (!retryable || i === MAX - 1) break;
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }
  const cause = (lastErr instanceof Error && (lastErr as NodeJS.ErrnoException).cause)
    ? String((lastErr as NodeJS.ErrnoException).cause)
    : undefined;
  return { attempts: MAX, result: { error: String(lastErr), cause } };
}

export async function GET() {
  const apiKey   = process.env.CIDERPAY_API_KEY;
  const devId    = process.env.CIDERPAY_DEV_ID;
  const devToken = process.env.CIDERPAY_DEV_TOKEN;
  const mid      = process.env.CIDERPAY_MID ?? "1140456136";
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL;

  const adapter = apiKey || (devId && devToken) ? "ciderpay" : "stub";

  const env = {
    adapter,
    CIDERPAY_API_KEY:     apiKey   ? `SET(${apiKey.slice(0, 8)}…)` : "NOT_SET",
    CIDERPAY_DEV_ID:      devId    ? "SET" : "NOT_SET",
    CIDERPAY_DEV_TOKEN:   devToken ? "SET" : "NOT_SET",
    CIDERPAY_MID:         mid,
    NEXT_PUBLIC_SITE_URL: siteUrl  ?? "NOT_SET",
  };

  if (adapter === "stub") {
    return NextResponse.json({ ...env, ciderpay: "SKIPPED (stub)" });
  }

  const { attempts, result } = await tryFetch(apiKey!, mid);
  return NextResponse.json({ ...env, ciderpay: result, attempts });
}
