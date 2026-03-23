import type { Metadata } from "next";
import KnowledgePageClient from "./KnowledgePageClient";

export const metadata: Metadata = {
  title: "Knowledge Bank",
  description:
    "Browse and manage knowledge sources stored on the rewrite stack.",
};

export default function KnowledgePage() {
  return <KnowledgePageClient />;
}
