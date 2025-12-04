import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://blah.chat"
      : "http://localhost:3000";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Future: Add dynamic /share/[id] pages when share feature is implemented
    // Query Convex for public shares and add them here
  ];
}
