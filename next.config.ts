import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    typedRoutes: false, // 禁用typedRoutes以兼容Turbopack
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
    },
  },
  typescript: {
    ignoreBuildErrors: true, // 临时忽略构建错误，方便开发调试
  }
};

export default nextConfig;
