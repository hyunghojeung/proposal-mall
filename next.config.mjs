/** @type {import('next').NextConfig} */
const nextConfig = {
  // Railway 등 리버스 프록시 환경에서 X-Forwarded-Host 헤더를 신뢰하도록 설정
  // 이 옵션이 없으면 req.nextUrl.origin 이 localhost:8080 으로 잘못 인식됨
  experimental: {
    trustHostHeader: true,
  },
};

export default nextConfig;
