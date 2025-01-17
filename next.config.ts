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

  // Webpack 配置
  webpack: (config) => {
    // 处理文件加载问题
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false
    };

    // 处理 @imgly/background-removal 等特殊依赖 (暂时注释)
    // config.externals = [...config.externals, 'canvas'];

    return config;
  },

  // 性能和兼容性优化
  productionBrowserSourceMaps: false,


  // 运行时配置
  reactStrictMode: true,

};

export default nextConfig;
