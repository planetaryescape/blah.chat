import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "blah.chat",
    short_name: "blah.chat",
    description: "Personal AI chat assistant - self-hosted ChatGPT alternative",
    start_url: "/",
    display: "standalone",
    background_color: "#191024",
    theme_color: "#8B5CF6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    categories: ["productivity", "utilities"],
  };
}
