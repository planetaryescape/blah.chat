import path from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const appVersion =
  process.env.APP_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  "dev";

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: appVersion,
  },
  // Disabled due to TanStack Table v8 compatibility issues (GitHub #5567, #5903)
  // Re-enable when TanStack Table v8.21+ adds official React Compiler support
  reactCompiler: false,
  serverExternalPackages: ["pg", "pino", "pino-pretty"],
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
  typescript: {
    // Set to false: typecheck is run independently via tsc; production builds
    // should fail on type regressions, not silently ship them.
    ignoreBuildErrors: false,
  },
  images: {
    // No remote-image hosts in use today. The Convex storage hostname was
    // removed when the migration to Postgres + R2 wrapped up — image URLs
    // now live on R2 (signed) or as data: URIs.
    remotePatterns: [],
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

const sentryEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

const withSentry = (config: NextConfig): NextConfig =>
  sentryEnabled
    ? withSentryConfig(config, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: appVersion },
        silent: !process.env.CI,
        widenClientFileUpload: true,
        sourcemaps: { deleteSourcemapsAfterUpload: true },
        disableLogger: true,
      })
    : config;

export default withSentry(withBundleAnalyzer(nextConfig));
