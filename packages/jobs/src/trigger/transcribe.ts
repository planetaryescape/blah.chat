import {
  createNeonDatabase,
  createR2Client,
  createSignedReadUrl,
  type PersistenceDb,
  parsePersistenceEnv,
  userPreferences,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";

const TRANSCRIPTION_TIMEOUT_MS = 90_000;
const MAX_FILE_SIZE_MB = 24;

type TranscriptionModel = "whisper-1" | "whisper-large-v3";
type PreferredProvider = "assemblyai" | "deepgram" | "groq" | "openai";
type SupportedProvider = "groq" | "openai";

type ResolvedProvider = {
  apiKey: string;
  model: string;
  provider: SupportedProvider;
  url: string;
};

function getStorageOwnerId(storageId: string) {
  const match = /^users\/([^/]+)\//.exec(storageId);
  return match?.[1] ?? null;
}

async function getUserPreference(
  db: PersistenceDb,
  userId: string,
  key: string,
) {
  const row = await db.query.userPreferences.findFirst({
    where: and(
      eq(userPreferences.userId, userId),
      eq(userPreferences.key, key),
    ),
  });

  return row?.value;
}

function resolveProvider(input: {
  preferredProvider?: unknown;
  requestedModel?: TranscriptionModel;
}): ResolvedProvider {
  const openAiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const preferredProvider =
    typeof input.preferredProvider === "string"
      ? (input.preferredProvider as PreferredProvider)
      : undefined;

  if (input.requestedModel === "whisper-1" && openAiKey) {
    return {
      provider: "openai",
      model: "whisper-1",
      url: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: openAiKey,
    };
  }

  if (input.requestedModel === "whisper-large-v3" && groqKey) {
    return {
      provider: "groq",
      model: "whisper-large-v3-turbo",
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: groqKey,
    };
  }

  if (preferredProvider === "groq" && groqKey) {
    return {
      provider: "groq",
      model: "whisper-large-v3-turbo",
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: groqKey,
    };
  }

  if (
    (preferredProvider === "openai" ||
      preferredProvider === "deepgram" ||
      preferredProvider === "assemblyai") &&
    openAiKey
  ) {
    return {
      provider: "openai",
      model: "whisper-1",
      url: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: openAiKey,
    };
  }

  if (groqKey) {
    return {
      provider: "groq",
      model: "whisper-large-v3-turbo",
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: groqKey,
    };
  }

  if (openAiKey) {
    return {
      provider: "openai",
      model: "whisper-1",
      url: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: openAiKey,
    };
  }

  throw new Error("No supported STT provider is configured");
}

export async function transcribeAudioFromStorage(input: {
  userId?: string;
  storageId: string;
  mimeType?: string;
  model?: TranscriptionModel;
}) {
  const ownerId = getStorageOwnerId(input.storageId);
  if (input.userId && ownerId !== input.userId) {
    throw new Error("File not found");
  }

  const env = parsePersistenceEnv(process.env);
  const db = createNeonDatabase(env.databaseUrl);

  let preferredProvider: undefined | unknown;
  if (ownerId) {
    const sttEnabled = await getUserPreference(db, ownerId, "sttEnabled");
    if (sttEnabled === false) {
      throw new Error("Voice input disabled in settings");
    }
    preferredProvider = await getUserPreference(db, ownerId, "sttProvider");
  }

  const r2 = createR2Client(env);
  const readUrl = await createSignedReadUrl({
    client: r2,
    bucket: env.r2.bucket,
    key: input.storageId,
  });
  const audioResponse = await fetch(readUrl, {
    signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
  });

  if (!audioResponse.ok) {
    throw new Error(
      `Failed to fetch audio from storage (${audioResponse.status})`,
    );
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const fileSizeMB = bytes.length / (1024 * 1024);

  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
    );
  }

  const mimeType =
    input.mimeType || audioResponse.headers.get("Content-Type") || "audio/webm";
  const file = new File([bytes], "audio.webm", {
    type: mimeType,
  });
  const provider = resolveProvider({
    preferredProvider,
    requestedModel: input.model,
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", provider.model);

  const providerResponse = await fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
  });

  if (!providerResponse.ok) {
    throw new Error(
      `${provider.provider} transcription failed: ${await providerResponse.text()}`,
    );
  }

  const payload = (await providerResponse.json()) as { text?: string };
  if (!payload.text) {
    throw new Error("Transcription provider returned no text");
  }

  return payload.text;
}

/**
 * Direct Trigger transcription on the Postgres/R2 runtime.
 * This no longer hops through the app-owned Convex bridge.
 */
export const transcribeTask = task({
  id: "transcribe",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    userId?: string;
    storageId: string;
    mimeType?: string;
    model?: TranscriptionModel;
  }) => {
    return transcribeAudioFromStorage({
      userId: payload.userId,
      storageId: payload.storageId,
      mimeType: payload.mimeType ?? "audio/webm",
      model: payload.model,
    });
  },
});
