import type { Metadata } from "next";
import BookmarksPageClient from "./BookmarksPageClient";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Saved messages from across all your conversations.",
};

export default function BookmarksPage() {
  return <BookmarksPageClient />;
}
