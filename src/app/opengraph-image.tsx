import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "PolyComparison — compare Polymarket and Kalshi odds instantly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const logoData = readFileSync(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#08090d",
          backgroundImage:
            "radial-gradient(circle at 12% 15%, rgba(76,139,245,0.28), transparent 45%), radial-gradient(circle at 88% 85%, rgba(34,197,139,0.28), transparent 45%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={logoSrc} alt="" width={84} height={84} style={{ borderRadius: 18 }} />
          <span style={{ fontSize: 58, fontWeight: 700, color: "#e7e9ee" }}>PolyComparison</span>
        </div>

        <div style={{ display: "flex", marginTop: 36 }}>
          <span style={{ fontSize: 34, color: "#e7e9ee", maxWidth: 920, lineHeight: 1.35 }}>
            Compare Polymarket and Kalshi odds for the same event, instantly.
          </span>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(76,139,245,0.4)",
              backgroundColor: "rgba(76,139,245,0.12)",
            }}
          >
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, backgroundColor: "#4c8bf5" }} />
            <span style={{ fontSize: 24, color: "#4c8bf5", fontWeight: 600 }}>Polymarket</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,139,0.4)",
              backgroundColor: "rgba(34,197,139,0.12)",
            }}
          >
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, backgroundColor: "#22c58b" }} />
            <span style={{ fontSize: 24, color: "#22c58b", fontWeight: 600 }}>Kalshi</span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 52 }}>
          <span style={{ fontSize: 22, color: "#8b8fa3" }}>
            Probability gaps · Volume · Better-odds verdict — polycomparison.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
