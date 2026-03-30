import { createPreferenceRepository } from "@blah-chat/persistence-postgres";
import { PREFERENCE_DEFAULTS } from "@blah-chat/shared/preferences";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

type SupportedSttProvider = "groq" | "openai";
type RequestedSttProvider = SupportedSttProvider | "deepgram" | "assemblyai";

function resolveSttAvailability(requestedProvider: RequestedSttProvider) {
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const hasDeepgramKey = Boolean(process.env.DEEPGRAM_API_KEY);
  const hasAssemblyAiKey = Boolean(process.env.ASSEMBLYAI_API_KEY);

  const currentProvider = (() => {
    if (requestedProvider === "groq" && hasGroqKey) {
      return "groq" satisfies SupportedSttProvider;
    }

    if (requestedProvider === "openai" && hasOpenAiKey) {
      return "openai" satisfies SupportedSttProvider;
    }

    if (hasOpenAiKey) {
      return "openai" satisfies SupportedSttProvider;
    }

    if (hasGroqKey) {
      return "groq" satisfies SupportedSttProvider;
    }

    return requestedProvider === "groq" ? "groq" : "openai";
  })();

  return {
    groq: hasGroqKey,
    openai: hasOpenAiKey,
    deepgram: hasDeepgramKey,
    assemblyai: hasAssemblyAiKey,
    currentProvider,
    currentProviderKeyName:
      currentProvider === "groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY",
    hasCurrentProviderKey:
      currentProvider === "groq" ? hasGroqKey : hasOpenAiKey,
  };
}

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/settings/api-key-availability");

  const db = getPersistenceDb();
  await ensureCurrentPersistenceUser(userId);

  const preferenceRepo = createPreferenceRepository(db);
  const requestedProvider =
    ((await preferenceRepo.getForClerkId(userId, "sttProvider")) as
      | RequestedSttProvider
      | undefined) ?? PREFERENCE_DEFAULTS.sttProvider;

  const availability = {
    stt: resolveSttAvailability(requestedProvider),
    tts: {
      deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    },
    isProduction: process.env.NODE_ENV === "production",
  };

  return NextResponse.json(formatEntity(availability, "apiKeyAvailability"));
}

export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
