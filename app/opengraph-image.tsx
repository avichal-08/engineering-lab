import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = "Invariants — Understand how software really works.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top: Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#22d3ee",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
            >
              <path d="M12 3L20 8.5V15.5L12 21L4 15.5V8.5L12 3Z" opacity="0.4" />
              <path d="M12 8L16 11V15L12 17L8 15V11L12 8Z" />
              <circle cx="12" cy="12.5" r="1.5" fill="#22d3ee" />
            </svg>
          </div>
          <span
            style={{
              display: "flex",
              fontSize: "28px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.03em",
            }}
          >
            {siteConfig.name}
          </span>
        </div>

        {/* Center: Headline & Subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "60px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            <span>Stop memorizing.</span>
            <span style={{ color: "#22d3ee" }}>
              Start understanding how software works.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              color: "#a1a1aa",
              maxWidth: "900px",
              lineHeight: 1.4,
            }}
          >
            Interactive engineering labs for understanding software through
            experimentation, visualization, building, and failure.
          </div>
        </div>

        {/* Bottom Bar: Telemetry & Lab Count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "32px",
            color: "#71717a",
            fontSize: "18px",
            fontFamily: "monospace",
          }}
        >
          <span style={{ display: "flex" }}>
            ● 10 Interactive Labs &bull; Go, TypeScript, Python, Java
          </span>
          <span style={{ display: "flex", color: "#22d3ee" }}>
            invariants.dev
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
