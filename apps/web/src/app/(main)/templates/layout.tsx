import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates",
  description: "Reusable prompts you can drop into any conversation.",
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
