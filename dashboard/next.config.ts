import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@miko/db"],
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;