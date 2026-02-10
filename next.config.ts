import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large screenshot payloads
  serverExternalPackages: ["socket.io"],
};

export default nextConfig;
