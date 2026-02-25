import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router with SSR (not static export — needs Vercel)
  serverExternalPackages: ['@exceptionless/node'],
};

export default nextConfig;
