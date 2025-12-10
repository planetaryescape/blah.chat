import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pino", "pino-pretty"],
  typescript: {
    ignoreBuildErrors: true,
  },

  // Source maps for error tracking (PostHog)
  // NOTE: Upload to PostHog with: bunx @posthog/plugin-source-maps upload
  // Then delete from public build for security
  productionBrowserSourceMaps: true,
};

export default withBundleAnalyzer(nextConfig);
