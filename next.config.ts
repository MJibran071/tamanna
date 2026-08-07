import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ["*"],
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    webpackBuildWorker: true,
  },
};

export default nextConfig;
