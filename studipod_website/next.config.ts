import type { NextConfig } from "next";
import { API_CONTENT_SECURITY_POLICY, securityHeaders } from "./src/lib/security/headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // 75 is the default; 90 is used by the hero image, which contains small text.
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        // Baseline hardening for every response. The page CSP is nonce-based and
        // set per request in src/proxy.ts.
        source: "/:path*",
        headers: securityHeaders({ isProduction }),
      },
      {
        // API responses: no content may load, never indexed, never cached.
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: API_CONTENT_SECURITY_POLICY },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
