import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrCreateLandingConversation } from "@/lib/api/dal/conversations";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";

export const metadata: Metadata = {
  title: "App",
  description: "Loading your workspace.",
};

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await ensureCurrentPersistenceUser(userId, { sessionClaims });
  const conversationId = await getOrCreateLandingConversation(userId, {
    sessionClaims,
  });

  redirect(`/chat/${conversationId}`);
}
