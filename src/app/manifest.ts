import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "blah.chat",
    short_name: "blah.chat",
    description: "The bespoke AI interface. Total Control. One Interface.",
    start_url: "/",
    display: "standalone",
    background_color: "#191024", // Deep Slate
    theme_color: "#191024", // Deep Slate (consistent with dark theme)
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
    categories: ["productivity", "utilities"],
  };
}
