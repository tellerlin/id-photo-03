// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },

  // 性能和兼容性优化
  productionBrowserSourceMaps: false,

  // 运行时配置
  reactStrictMode: true,
};

export default nextConfig;
