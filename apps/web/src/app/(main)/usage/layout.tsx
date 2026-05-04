import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage",
  description: "Track tokens, cost, and per-model usage across your workspace.",
};

export default function UsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
