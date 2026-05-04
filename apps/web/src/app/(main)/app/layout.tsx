import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App",
  description: "Loading your workspace.",
};

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
