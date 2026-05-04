import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memories",
  description:
    "Browse and edit the long-term memories the assistant has built about you.",
};

export default function MemoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
