export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Pretendard — 얇고 깔끔한 한국어 산세리프 */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
      />
      <div className="admin-dark w-full">{children}</div>
    </>
  );
}
