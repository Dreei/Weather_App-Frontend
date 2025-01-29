import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // Ensures App Router is enabled
  },
};

export default nextConfig;