import type { Metadata } from "next";
import AppPageClient from "./AppPageClient";

export const metadata: Metadata = {
  title: "App",
  description: "Loading your workspace.",
};

export default function AppPage() {
  return <AppPageClient />;
}
