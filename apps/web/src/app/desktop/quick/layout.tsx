import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick chat",
  description: "Send a single prompt without leaving your desktop workspace.",
};

export default function QuickChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
