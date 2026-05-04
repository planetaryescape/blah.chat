import type { Metadata } from "next";
import TemplatesPageClient from "./TemplatesPageClient";

export const metadata: Metadata = {
  title: "Templates",
  description: "Reusable prompts you can drop into any conversation.",
};

export default function TemplatesPage() {
  return <TemplatesPageClient />;
}
