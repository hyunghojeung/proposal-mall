"use client";
import { useRef, useState, useEffect } from "react";
import { AdminShell } from "@/components/AdminShell";

export default function StampUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  /* 현재 등록된 도장 불러오기 */
  useEffect(() => {
    fetch("/api/stamp")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.ok) setCurrent(data.dataUrl); })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus("");
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) { setStatus("파일을 선택해주세요."); return; }
    setLoading(true);
    setStatus("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/save-stamp", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setCurrent(preview); // 현재 도장 갱신
      } else {
        setStatus("error:" + (data.error ?? "알 수 없는 오류"));
      }
    } catch {
      setStatus("error:네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell active="stamp" title="도장 이미지 관리">
      <div className="max-w-md">
        <p className="mb-6 text-[15px] text-ink-sub">
          견적서 우측에 표시되는 직인(도장) 이미지를 등록합니다.
          배경이 투명한 PNG 파일을 권장합니다.
        </p>

        {/* 현재 등록된 도장 */}
        <div className="mb-8 rounded border border-line bg-bg p-5">
          <p className="mb-3 text-[13px] font-bold text-ink-sub">현재 등록된 도장</p>
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="현재 도장" className="h-24 w-24 object-contain" />
          ) : (
            <p className="text-[13px] text-ink-del">등록된 도장이 없습니다.</p>
          )}
        </div>

        {/* 파일 선택 */}
        <label className="mb-4 block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">
            새 도장 이미지 선택 <span className="text-brand">*</span>
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChange}
            className="block w-full rounded border border-line bg-white px-4 py-2.5 text-[14px] text-ink file:mr-4 file:rounded file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[13px] file:font-bold file:text-white"
          />
        </label>

        {/* 미리보기 */}
        {preview && (
          <div className="mb-6 rounded border border-line bg-bg p-4">
            <p className="mb-2 text-[13px] font-bold text-ink-sub">미리보기</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="미리보기" className="h-24 w-24 object-contain" />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading || !preview}
          className="rounded bg-brand px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장"}
        </button>

        {status === "ok" && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-[14px] font-medium text-green-700">
            ✅ 도장 이미지가 DB에 저장되었습니다. 재배포 후에도 유지됩니다.
          </div>
        )}
        {status.startsWith("error:") && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-600">
            ❌ {status.replace("error:", "")}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
