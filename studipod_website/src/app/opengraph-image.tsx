import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/** Social sharing card (Open Graph / Twitter), generated at build time. */
export const alt = "StudiPod — The Study Experience, Reimagined";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #172554 0%, #1e3a8a 60%, #2563eb 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* The brand's coral play mark (SVG: the image renderer has no CSS triangles). */}
          <svg width="30" height="32" viewBox="0 0 30 32" style={{ marginLeft: 6 }}>
            <path
              d="M2 3.4C2 1.5 4 .3 5.7 1.3l21.4 12.3c1.6.9 1.6 3.3 0 4.2L5.7 30.1C4 31.1 2 29.9 2 28z"
              fill="#fb7185"
            />
          </svg>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{siteConfig.name}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>
          The Study Experience, Reimagined
        </div>
        <div style={{ fontSize: 30, color: "#bfdbfe", maxWidth: 900, lineHeight: 1.35 }}>
          Peer-to-peer collaborative learning and exam preparation.
        </div>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#dbeafe" }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 999, background: "#fb7185" }} />
        {siteConfig.tagline}
      </div>
    </div>,
    size,
  );
}
