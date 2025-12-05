import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
};

export default withBundleAnalyzer(nextConfig);
