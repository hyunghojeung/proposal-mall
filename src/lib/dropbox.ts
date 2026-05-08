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

// 관리자가 업로드한 이미지를 Dropbox에 저장하고 직접 링크(raw URL)를 반환.
// 미설정 시 stub URL 반환.
export async function uploadProductImage(opts: {
  filename: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  if (!isConfigured()) {
    return `https://placehold.co/800x1000/f5f5f5/888888?text=${encodeURIComponent(opts.filename)}`;
  }

  const folder = (process.env.DROPBOX_PRODUCT_FOLDER ?? "/proposal-mall-products").replace(/\/$/, "");

  // 한글·특수문자 제거 → 타임스탬프 기반 안전한 파일명
  const ext = opts.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
  const destPath = `${folder}/${Date.now()}.${ext}`;

  const token = await getAccessToken();

  // 1) 파일 업로드
  const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: destPath,
        mode: "add",
        autorename: true,
        mute: true,
      }),
    },
    body: new Uint8Array(opts.buffer),
  });
  if (!uploadRes.ok) {
    const t = await uploadRes.text();
    throw new Error(`Dropbox upload failed: ${uploadRes.status} ${t}`);
  }
  const uploadData = (await uploadRes.json()) as { path_lower: string };

  // 2) 공유 링크 생성
  const linkRes = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: uploadData.path_lower,
      settings: { requested_visibility: "public" },
    }),
  });

  let sharedUrl: string;
  if (linkRes.ok) {
    const linkData = (await linkRes.json()) as { url: string };
    sharedUrl = linkData.url;
  } else {
    // 이미 공유 링크가 있는 경우 재활용
    const errData = (await linkRes.json()) as { error?: { shared_link_already_exists?: { metadata?: { url?: string } } } };
    const existing = errData?.error?.shared_link_already_exists?.metadata?.url;
    if (existing) {
      sharedUrl = existing;
    } else {
      throw new Error(`Dropbox shared link failed: ${linkRes.status}`);
    }
  }

  // dl.dropboxusercontent.com + ?raw=1 로 변환하면 img src에 직접 사용 가능
  return sharedUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/\?dl=\d$/, "") + "?raw=1";
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
