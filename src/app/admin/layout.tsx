export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 나눔고딕 — Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap"
      />
      <div className="admin-dark w-full">{children}</div>
    </>
  );
}
