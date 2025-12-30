import path from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Disabled due to TanStack Table v8 compatibility issues (GitHub #5567, #5903)
  // Re-enable when TanStack Table v8.21+ adds official React Compiler support
  reactCompiler: false,
  serverExternalPackages: ["pino", "pino-pretty"],
  // PostHog reverse proxy to bypass ad blockers
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
  // Turbopack is default in Next.js 16
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Monaco editor web workers support (webpack fallback)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
