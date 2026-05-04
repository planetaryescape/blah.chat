import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search across every conversation, note, bookmark, and memory in your workspace.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
