import type { Metadata } from "next";
import QuickPageClient from "./QuickPageClient";

export const metadata: Metadata = {
  title: "Quick chat",
  description: "Send a single prompt without leaving your desktop workspace.",
};

export default function QuickPage() {
  return <QuickPageClient />;
}
