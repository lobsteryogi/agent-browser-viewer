import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/apps/browser-viewer",
  serverExternalPackages: ["socket.io", "better-sqlite3"],
};

export default nextConfig;
