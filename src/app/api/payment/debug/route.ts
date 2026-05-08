import https from "node:https";
import { Resolver } from "node:dns/promises";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Railway 시스템 DNS 우회 — Google/Cloudflare DNS로 직접 resolve
const _resolver = new Resolver();
_resolver.setServers(["8.8.8.8", "1.1.1.1"]);

async function tryFetch(
  apiKey: string,
  mid: string,
): Promise<{ attempts: number; resolvedIp: string | null; result: unknown }> {
  const hostname = "api.ciderpay.com";

  // 1. DNS 조회 (공개 DNS)
  let resolvedIp: string | null = null;
  try {
    const addrs = await _resolver.resolve4(hostname);
    resolvedIp = addrs[0] ?? null;
  } catch (dnsErr) {
    return {
      attempts:   0,
      resolvedIp: null,
      result:     { error: "DNS 조회 실패", cause: String(dnsErr) },
    };
  }

  // 2. HTTPS 요청 (IP 직접 연결 + Host / SNI 헤더)
  const MAX = 3;
  let lastErr: unknown;

  for (let i = 0; i < MAX; i++) {
    try {
      const result = await new Promise<{ httpStatus: number; ok: boolean; body: unknown }>(
        (resolve, reject) => {
          const body = JSON.stringify({
            memberID: mid, price: 100, goodName: "test",
            mobile: "01012345678", customName: "test", email: "t@t.com",
            feedbackurl: "https://example.com/cb",
            returnurl:   "https://example.com/ret",
            returnmode: "JUST", var1: "DEBUG-001", var2: "TEST",
            smsuse: "N", whereFrom: "TEST", sellerMemo: "test",
            makeQr: "false", charSet: "UTF-8",
            goods: [{ goodName: "test", goodPrice: 100, useTax: true }],
          });

          const req = https.request(
            {
              host:       resolvedIp!,
              port:       443,
              path:       "/oapi/payment/request/s2",
              method:     "POST",
              headers: {
                Host:               hostname,
                accept:             "application/json",
                "Content-Type":     "application/json",
                approvalToken:      apiKey,
                Authorization:      `Bearer ${apiKey}`,
                "X-API-Key":        apiKey,
                "X-Requested-With": "XMLHttpRequest",
              },
              servername: hostname,
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on("data",  (c: Buffer) => chunks.push(c));
              res.on("end",   () => {
                const raw = Buffer.concat(chunks).toString("utf-8");
                let parsed: unknown;
                try { parsed = JSON.parse(raw); } catch { parsed = raw; }
                resolve({
                  httpStatus: res.statusCode ?? 0,
                  ok:         (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
                  body:       parsed,
                });
              });
              res.on("error", reject);
            },
          );
          req.on("error", reject);
          req.write(body);
          req.end();
        },
      );

      return { attempts: i + 1, resolvedIp, result };
    } catch (e) {
      lastErr = e;
      if (i < MAX - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }

  return {
    attempts:   MAX,
    resolvedIp,
    result:     { error: String(lastErr) },
  };
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

  const { attempts, resolvedIp, result } = await tryFetch(apiKey!, mid);
  return NextResponse.json({ ...env, resolvedIp, ciderpay: result, attempts });
}
