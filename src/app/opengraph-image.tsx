import { ImageResponse } from "next/og";

// Site-wide share card. Text-only: no third-party photos.
export const alt = "Coffee Club: the curated guide to Chicagoland cafes that leaves the city";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fffbeb 0%, #f5f5f4 60%, #e7e5e4 100%)",
          color: "#1c1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#b45309", fontWeight: 700 }}>COFFEE CLUB</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>The curated cafe guide</div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, color: "#b45309" }}>that leaves the city.</div>
          <div style={{ display: "flex", fontSize: 34, color: "#57534e", marginTop: 24 }}>
            Chicago and the suburbs: hours, open now, and a passport to stamp.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#78716c" }}>coffee-club.dev</div>
      </div>
    ),
    { ...size }
  );
}
