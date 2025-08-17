// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["localhost", "lh3.googleusercontent.com", "cdn.discordapp.com"],
  },
};

export default nextConfig;
