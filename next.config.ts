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


    // 处理 @imgly/background-removal 等特殊依赖
    config.externals = [...config.externals, 'canvas'];


    return config;
  },


  // 性能和兼容性优化
  productionBrowserSourceMaps: false,
  swcMinify: true,
  
  // 运行时配置
  reactStrictMode: true,


  // 可能需要的跨域配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ]
      }
    ];
  }
};


export default nextConfig;