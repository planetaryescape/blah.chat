export const dynamic = "force-dynamic";

import MainLayoutClient from "./MainLayoutClient";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutClient>{children}</MainLayoutClient>;
}
