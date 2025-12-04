import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "blah.chat - Self-hosted AI chat assistant";
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
        background:
          "radial-gradient(circle at 0% 0%, #8B5CF633, transparent 50%), radial-gradient(circle at 100% 100%, #22D3EE33, transparent 50%), #191024",
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
        Self-hosted AI · Multi-model · Full control
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
