import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Saved messages from across all your conversations.",
};

export default function BookmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
