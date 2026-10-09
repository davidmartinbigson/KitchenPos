import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained production server in .next/standalone so the
  // app can be deployed to any VPS (Hostinger etc.) with just Node.js.
  output: "standalone",
};

export default nextConfig;
