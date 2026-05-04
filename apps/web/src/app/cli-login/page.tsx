import type { Metadata } from "next";
import CLILoginPageClient from "./CLILoginPageClient";

export const metadata: Metadata = {
  title: "CLI login",
  description: "Authorize the blah.chat CLI to access your account.",
};

export default function CLILoginPage() {
  return <CLILoginPageClient />;
}
