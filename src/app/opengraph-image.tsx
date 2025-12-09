import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "blah.chat - Personal AI chat assistant";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#191024",
      }}
    >
      {/* Brand Name */}
      <div
        style={{
          display: "flex",
          fontSize: 120,
          fontWeight: 900,
          color: "#FFFFFF",
          marginBottom: 20,
        }}
      >
        blah.chat
      </div>

      {/* Tagline */}
      <div
        style={{
          display: "flex",
          fontSize: 36,
          color: "#22D3EE",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        All Models · Branching · Full Control
      </div>

      {/* Company Attribution */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          fontSize: 24,
          color: "#FFFFFF80",
        }}
      >
        Planetary Escape
      </div>
    </div>,
    {
      ...size,
    },
  );
}
