import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://blah.chat"
      : "http://localhost:3000";

  return {
    rules: [
      // General crawlers
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/chat/*",
          "/settings",
          "/memories",
          "/projects",
          "/usage",
          "/templates",
          "/search",
          "/api/*",
          "/_next/*",
          "/sign-in",
          "/sign-up",
        ],
      },
      // AI crawlers (ChatGPT, Claude, Perplexity)
      {
        userAgent: ["ChatGPT-User", "GPTBot", "ClaudeBot", "PerplexityBot"],
        allow: ["/", "/share/*"],
        disallow: ["/chat/*", "/settings", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
