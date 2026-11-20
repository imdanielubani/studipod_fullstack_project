import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/security/headers";

/**
 * Per-request Content-Security-Policy with a fresh nonce.
 *
 * Next.js reads the CSP from the request headers during server rendering and
 * applies the nonce to its own scripts automatically; the nonce is also exposed
 * as `x-nonce` for the few inline elements we render ourselves.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const servedOverHttps = request.nextUrl.protocol === "https:";

  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDevelopment,
    upgradeInsecureRequests: !isDevelopment && servedOverHttps,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    /*
     * All page requests except API routes (which get a stricter static CSP),
     * static assets, image optimisation and metadata files. Prefetches are
     * skipped because they do not render HTML that needs a nonce.
     */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
