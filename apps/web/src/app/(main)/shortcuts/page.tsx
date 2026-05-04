import type { Metadata } from "next";
import ShortcutsPageClient from "./ShortcutsPageClient";

export const metadata: Metadata = {
  title: "Keyboard shortcuts",
  description: "Every keyboard shortcut available in blah.chat.",
};

export default function ShortcutsPage() {
  return <ShortcutsPageClient />;
}
