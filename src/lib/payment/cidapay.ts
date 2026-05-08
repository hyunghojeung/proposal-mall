// 사이다페이 연동 어댑터 (공식 API 문서 기준)
//
// 결제 흐름:
//   1. GET  /oapi/pmember/makeWebKey                   → approvalToken 동적 발급
//   2. POST /oapi/payment/request                      → payUrl 획득 → 사용자 팝업
//   3. 결제완료 → feedbackurl(POST) 수신 → 주문 PAID 처리
//   4. 취소 시 → POST /oapi/payment/cancel (feedbackToken + orderNo)
//
// 필요 환경변수:
//   CIDERPAY_DEV_ID    개발사 아이디
//   CIDERPAY_DEV_TOKEN 개발사 토큰
//   CIDERPAY_MID       가맹점 회원 아이디 (기본값: 1140456136)
//
// Railway 컨테이너 DNS 우회:
//   시스템 DNS 대신 Google(8.8.8.8) / Cloudflare(1.1.1.1)로 직접 resolve
//   → node:https로 IP에 직접 연결 (Host 헤더 + TLS SNI 정상 처리)

import https from "node:https";
import { Resolver } from "node:dns/promises";
import type {
  PaymentAdapter,
  PaymentInitInput,
  PaymentInitResult,
  PaymentReturnPayload,
} from "./types";

const BASE = "https://api.ciderpay.com";

// ── 공개 DNS 기반 fetch ────────────────────────────────────────────────────

const _resolver = new Resolver();
_resolver.setServers(["8.8.8.8", "1.1.1.1"]);

// 5분 TTL DNS 캐시 (Railway는 컨테이너 IP가 자주 바뀌지 않음)
const _dnsCache = new Map<string, { ip: string; exp: number }>();

async function resolveIp(hostname: string): Promise<string> {
  const hit = _dnsCache.get(hostname);
  if (hit && hit.exp > Date.now()) return hit.ip;
  const addrs = await _resolver.resolve4(hostname);
  if (!addrs.length) throw new Error(`DNS: A 레코드 없음 (${hostname})`);
  const ip = addrs[0];
  _dnsCache.set(hostname, { ip, exp: Date.now() + 5 * 60_000 });
  console.log(`[ciderpay] DNS ${hostname} → ${ip} (via 8.8.8.8)`);
  return ip;
}

interface CiderResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

/**
 * Railway의 시스템 DNS를 완전히 우회하여 api.ciderpay.com 호출.
 * - Google/Cloudflare DNS로 IP 조회
 * - node:https 로 IP에 직접 TCP 연결
 * - Host 헤더 + TLS servername(SNI) 올바르게 설정 → 인증서 오류 없음
 */
async function ciderFetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
  retries = 2,
): Promise<CiderResponse> {
  const parsed   = new URL(url);
  const hostname = parsed.hostname;
  const path     = parsed.pathname + (parsed.search ?? "");

  for (let attempt = 0; attempt <= retries; attempt++) {
    // 먼저 IP 확보 (캐시 or Google DNS)
    let ip: string;
    try {
      ip = await resolveIp(hostname);
    } catch (dnsErr) {
      console.error(`[ciderpay] DNS 조회 실패: ${String(dnsErr)}`);
      // DNS 자체가 실패하면 hostname 그대로 시도 (시스템 DNS fallback)
      ip = hostname;
    }

    try {
      const resp = await new Promise<CiderResponse>((resolve, reject) => {
        const req = https.request(
          {
            host:       ip,          // 연결할 IP (또는 hostname fallback)
            port:       443,
            path,
            method:     init.method,
            headers:    { ...init.headers, Host: hostname },
            servername: hostname,    // TLS SNI — 인증서 검증에 필요
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data",  (c: Buffer) => chunks.push(c));
            res.on("end",   () => {
              const raw = Buffer.concat(chunks).toString("utf-8");
              resolve({
                ok:     (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
                status: res.statusCode ?? 0,
                json:   () => { try { return Promise.resolve(JSON.parse(raw)); } catch { return Promise.reject(new Error("JSON 파싱 오류")); } },
                text:   () => Promise.resolve(raw),
              });
            });
            res.on("error", reject);
          },
        );
        req.on("error", reject);
        if (init.body) req.write(init.body);
        req.end();
      });
      return resp;
    } catch (e) {
      console.warn(`[ciderpay] 요청 실패 (시도 ${attempt + 1}/${retries + 1}): ${String(e)}`);
      if (attempt === retries) throw e;
      _dnsCache.delete(hostname); // 재시도 전 캐시 초기화
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error("ciderFetch: unreachable");
}

// ── 공통 유틸 ────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`사이다페이: 환경변수 ${name} 가 설정되지 않았습니다.`);
  return v;
}

function getMid(): string {
  return process.env.CIDERPAY_MID ?? "1140456136";
}

function devHeaders(): Record<string, string> {
  return {
    accept:     "application/json",
    devID:      requireEnv("CIDERPAY_DEV_ID"),
    devToken:   requireEnv("CIDERPAY_DEV_TOKEN"),
  };
}

// ── makeWebKey ────────────────────────────────────────────────────────────

// GET /oapi/pmember/makeWebKey
// devID + devToken 헤더, memberID 쿼리파라미터로 approvalToken 동적 발급
async function fetchMakeWebKey(): Promise<string> {
  const url = new URL(`${BASE}/oapi/pmember/makeWebKey`);
  url.searchParams.set("memberID", getMid());

  const res = await ciderFetch(url.toString(), {
    method:  "GET",
    headers: devHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`사이다페이 makeWebKey 실패 (${res.status}): ${text}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as Record<string, any>;
  console.log("[ciderpay] makeWebKey 응답:", JSON.stringify(json));

  // 공식 문서 기준 응답: { success, message, var1 }
  const approvalToken = json?.var1 ?? null;
  if (!approvalToken) {
    throw new Error(
      json?.message
        ? `사이다페이 makeWebKey 오류: ${json.message}`
        : `사이다페이: var1(토큰) 없음. 응답: ${JSON.stringify(json)}`
    );
  }
  return String(approvalToken);
}

// ── 어댑터 ───────────────────────────────────────────────────────────────

export const cidapayAdapter: PaymentAdapter = {
  name: "ciderpay",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const mid = getMid();

    // approvalToken 획득
    let approvalToken: string;
    const staticKey = process.env.CIDERPAY_API_KEY;
    if (staticKey) {
      approvalToken = staticKey;
    } else {
      approvalToken = await fetchMakeWebKey();
    }

    const origin      = new URL(input.returnUrl).origin;
    const feedbackUrl = `${origin}/api/payment/webhook`;
    const returnUrl   = `${origin}/api/payment/return?order=${encodeURIComponent(input.orderSerial)}`;

    const paymentData = {
      memberID:    mid,
      price:       input.amount,
      goodName:    input.productName,
      mobile:      input.customerPhone.replace(/-/g, ""),
      customName:  input.customerName,
      email:       input.customerEmail,
      feedbackurl: feedbackUrl,
      returnurl:   returnUrl,
      returnmode:  "JUST",
      var1:        input.orderSerial,
      var2:        "PROPOSAL_MALL",
      smsuse:      "Y",
      whereFrom:   "PROPOSAL_MALL_WEBSITE",
      sellerMemo:  "제안서박스몰 주문 결제",
      makeQr:      "false",
      charSet:     "UTF-8",
      goods: [
        {
          goodName:  input.productName,
          goodPrice: input.amount,
          useTax:    true,
        },
      ],
    };

    const res = await ciderFetch(`${BASE}/oapi/payment/request/s2`, {
      method:  "POST",
      headers: {
        accept:             "application/json",
        "Content-Type":     "application/json",
        approvalToken,
        Authorization:      `Bearer ${approvalToken}`,
        "X-API-Key":        approvalToken,
        "X-Requested-With": "XMLHttpRequest",
        Origin:             origin,
      },
      body: JSON.stringify(paymentData),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`사이다페이 결제요청 실패 (${res.status}): ${text}`);
    }

    const result = await res.json() as {
      success?:     boolean;
      payUrl?:      string;
      payUniqueNo?: string;
      errCode?:     string;
      message?:     string;
    };

    if (result.payUrl) {
      return { redirectUrl: result.payUrl };
    }

    throw new Error(
      result.message
        ? `사이다페이 오류 [${result.errCode ?? "?"}]: ${result.message}`
        : "사이다페이: payUrl 없음"
    );
  },

  // returnmode=JUST → 결제완료 후 GET으로 returnurl 즉시 호출
  parseReturn(query: URLSearchParams): PaymentReturnPayload {
    const orderSerial = query.get("order") ?? query.get("var1") ?? "";
    const state       = query.get("paymentState") ?? "";
    const cancelled   = state === "CANCEL";

    return {
      orderSerial,
      status:       cancelled ? "cancelled" : "success",
      tid:          query.get("orderNo") ?? undefined,
      amount:       query.get("price") ? Number(query.get("price")) : undefined,
      errorMessage: query.get("errorMessage") ?? undefined,
    };
  },

  // feedbackurl: 사이다페이 서버 → 우리 서버 POST 통지
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyWebhook(rawBody: string, _signature: string | null) {
    try {
      let data: Record<string, string>;
      if (rawBody.startsWith("{")) {
        data = JSON.parse(rawBody) as Record<string, string>;
      } else {
        data = Object.fromEntries(new URLSearchParams(rawBody));
      }

      const state     = String(data.paymentState ?? "");
      const success   = state === "COMPLETE";
      const cancelled = state === "CANCEL";

      return {
        valid: true,
        payload: {
          orderSerial:  String(data.var1 ?? ""),
          status:       success ? "success" : cancelled ? "cancelled" : "failed",
          tid:          data.orderNo     ?? undefined,
          amount:       data.price ? Number(data.price) : undefined,
          errorMessage: data.errorMessage ?? undefined,
        } satisfies PaymentReturnPayload,
      };
    } catch {
      return { valid: false };
    }
  },
};

// ── 결제 취소 유틸 (관리자 패널에서 호출) ──────────────────────────────────
export async function cancelPayment(params: {
  orderNo: string;
  token: string;
  cancelMessage?: string;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const mid = getMid();

  const res = await ciderFetch(`${BASE}/oapi/payment/cancel`, {
    method:  "POST",
    headers: {
      accept:          "application/json",
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      memberID:      mid,
      orderNo:       params.orderNo,
      token:         params.token,
      rangeType:     "ALL",
      cancelMessage: params.cancelMessage ?? "주문 취소",
    }),
  });

  const json = await res.json() as { success?: boolean; errorMessage?: string; message?: string };
  return {
    success:      json.success === true,
    errorMessage: json.errorMessage ?? json.message,
  };
}
