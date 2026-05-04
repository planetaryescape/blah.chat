import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "blah.chat - Personal AI chat for any model",
  description:
    "GPT, Claude, Gemini, Grok, GLM, MiniMax, Kimi, and more. Switch mid-chat. Compare responses. Own your data.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
