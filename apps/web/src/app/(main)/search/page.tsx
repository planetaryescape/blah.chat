import type { Metadata } from "next";
import SearchPageClient from "./SearchPageClient";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search across every conversation, note, bookmark, and memory in your workspace.",
};

export default function SearchPage() {
  return <SearchPageClient />;
}
