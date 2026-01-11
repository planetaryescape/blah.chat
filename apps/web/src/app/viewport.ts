import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EF" }, // Warm cream
    { media: "(prefers-color-scheme: dark)", color: "#292C33" }, // Dark slate (oklch 20% 0.01 260 approx)
  ],
};
