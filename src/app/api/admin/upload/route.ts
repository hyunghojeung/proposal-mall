import { NextResponse, type NextRequest } from "next/server";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";
import { uploadProductImage } from "@/lib/dropbox";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return adminUnauthorized();

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "multipart/form-data 필요" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "file 필드 없음" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPG·PNG·WEBP·GIF만 허용" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하" }, { status: 400 });
  }

  try {
    const url = await uploadProductImage({
      filename: file.name,
      buffer,
      mimeType: file.type,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
