import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained production server in .next/standalone so the
  // app can be deployed to any VPS (Hostinger etc.) with just Node.js.
  output: "standalone",
  // Allow the dev server to be reached through preview tunnels / proxies
  // (Arena e2b preview, Cloudflare quick tunnels) — no effect in production.
  allowedDevOrigins: [
    "*.e2b.app",
    "*.trycloudflare.com",
    "place-moore-rocks-tracking.trycloudflare.com",
  ],
  // Bundle the welcome tutorial GIF into the signup serverless function
  // so welcome emails can attach it on any host (incl. Vercel).
  outputFileTracingIncludes: {
    "/api/auth/signup/route": ["./public/assets/welcome-tutorial.gif"],
  },
};

export default nextConfig;
