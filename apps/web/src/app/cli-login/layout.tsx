import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLI login",
  description: "Authorize the blah.chat CLI to access your account.",
};

export default function CliLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
