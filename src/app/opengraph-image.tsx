import { ImageResponse } from "next/og";

// Typographic share card — deliberately uses no photography, so a social
// preview can never imply an illustrative image shows the real venue.
export const alt = "The Gents Games & Entertainment — games and recreation in Nairobi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#161513",
          color: "#f4f1ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, border: "3px solid #f4f1ea", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 6 }}>
            <div style={{ width: 22, height: 5, background: "#b8202e" }} />
          </div>
          <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#c4beb2" }}>
            The Gents Games &amp; Entertainment
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 800, lineHeight: 1, textTransform: "uppercase" }}>
          <span>Your game.</span>
          <span>Your people.</span>
          <span>Your space.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, color: "#c4beb2" }}>
          <div style={{ width: 64, height: 4, background: "#b8202e" }} />
          Games &amp; recreation · Kileleshwa, Nairobi
        </div>
      </div>
    ),
    size,
  );
}
