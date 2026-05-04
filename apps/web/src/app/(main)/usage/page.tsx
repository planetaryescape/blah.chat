import type { Metadata } from "next";
import UsagePageClient from "./UsagePageClient";

export const metadata: Metadata = {
  title: "Usage",
  description: "Track tokens, cost, and per-model usage across your workspace.",
};

export default function UsagePage() {
  return <UsagePageClient />;
}
