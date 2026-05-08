"use client";
import { useRef, useState } from "react";

export default function StampUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) { setStatus("파일을 선택해주세요."); return; }
    setStatus("업로드 중...");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/save-stamp", { method: "POST", body: fd });
    const data = await res.json();
    if (data.ok) {
      setStatus("✅ 저장 완료! /public/stamp.png 로 저장되었습니다.");
    } else {
      setStatus("❌ 오류: " + (data.error ?? "알 수 없는 오류"));
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", fontFamily: "sans-serif", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>도장 이미지 업로드</h1>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
        견적서에 표시될 직인 이미지를 업로드합니다. PNG 파일 권장.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "block", marginBottom: 16 }}
      />

      {preview && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>미리보기:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="미리보기" style={{ width: 120, height: 120, objectFit: "contain", border: "1px solid #ddd" }} />
        </div>
      )}

      <button
        onClick={handleUpload}
        style={{
          background: "#E8481A", color: "#fff", border: "none",
          borderRadius: 6, padding: "10px 28px", fontSize: 15,
          fontWeight: 700, cursor: "pointer"
        }}
      >
        저장
      </button>

      {status && (
        <p style={{ marginTop: 16, fontSize: 14, color: status.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
          {status}
        </p>
      )}
    </div>
  );
}
