import { NextResponse, type NextRequest } from "next/server";
import { adminUnauthorized, isAdminRequest } from "@/lib/auth";
import { uploadDiagramFile } from "@/lib/dropbox";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

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

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "파일 크기는 50MB 이하" }, { status: 400 });
  }

  try {
    const url = await uploadDiagramFile({
      filename: file.name,
      buffer,
      mimeType: file.type,
    });
    return NextResponse.json({
      url,
      fileName: file.name,
      fileSize: formatSize(buffer.byteLength),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
