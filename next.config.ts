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
};

export default withBundleAnalyzer(nextConfig);
