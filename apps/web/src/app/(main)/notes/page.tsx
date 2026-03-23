import type { Metadata } from "next";
import { NotesPageClient } from "./NotesPageClient";

export const metadata: Metadata = {
  title: "Notes",
  description: "Browse and edit notes stored on the Postgres rewrite stack.",
};

export default function NotesPage() {
  return <NotesPageClient />;
}
