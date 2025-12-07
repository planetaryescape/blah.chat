import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default withBundleAnalyzer(nextConfig);
