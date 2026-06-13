/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cho phép build thành công ngay cả khi có cảnh báo eslint (MVP).
  // Lỗi TypeScript vẫn được kiểm tra nghiêm ngặt.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
