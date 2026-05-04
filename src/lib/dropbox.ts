// Dropbox 파일 요청(File Request) 헬퍼.
// 주문마다 고유 업로드 링크를 생성 → 고객은 로그인 없이 파일을 우리 Dropbox 폴더로 드롭.
//
// 환경변수:
//   DROPBOX_APP_KEY / DROPBOX_APP_SECRET
//   DROPBOX_REFRESH_TOKEN  — 우리 계정으로 OAuth 한 번 거친 뒤 발급
//   DROPBOX_DEST_FOLDER    — 저장 폴더 (예: "/proposal-mall-orders")
//
// 위 셋이 모두 채워졌을 때만 실제 호출. 비어있으면 stub URL 반환.

interface FileRequestResult {
  url: string;
  isStub: boolean;
}

const DROPBOX_API = "https://api.dropboxapi.com/2";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.token;
  }

  const appKey = process.env.DROPBOX_APP_KEY!;
  const appSecret = process.env.DROPBOX_APP_SECRET!;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN!;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const auth = Buffer.from(`${appKey}:${appSecret}`).toString("base64");

  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.DROPBOX_APP_KEY &&
      process.env.DROPBOX_APP_SECRET &&
      process.env.DROPBOX_REFRESH_TOKEN,
  );
}

export async function createOrderFileRequest(opts: {
  orderSerial: string;
  customerName: string;
}): Promise<FileRequestResult> {
  if (!isConfigured()) {
    // Stub: dev/preview 환경 — Dropbox 미연동 시 안내용 가짜 URL
    return {
      url: `https://www.dropbox.com/request/stub-${opts.orderSerial}`,
      isStub: true,
    };
  }

  const folder =
    process.env.DROPBOX_DEST_FOLDER?.replace(/\/$/, "") ?? "/proposal-mall-orders";
  const destination = `${folder}/${opts.orderSerial}`;
  const title = `[제안서몰] 주문 ${opts.orderSerial} — ${opts.customerName}`;

  const token = await getAccessToken();
  const res = await fetch(`${DROPBOX_API}/file_requests/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      destination,
      open: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dropbox file_request create failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { url: string };
  return { url: data.url, isStub: false };
}
