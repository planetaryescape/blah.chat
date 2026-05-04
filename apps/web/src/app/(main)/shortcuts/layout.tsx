import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keyboard shortcuts",
  description: "Every keyboard shortcut available in blah.chat.",
};

export default function ShortcutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
