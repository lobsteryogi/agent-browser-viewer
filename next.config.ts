import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/apps/browser-viewer",
  serverExternalPackages: ["socket.io", "better-sqlite3"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
