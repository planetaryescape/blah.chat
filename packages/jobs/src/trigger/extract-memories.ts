import { getGatewayOptions } from "@blah-chat/ai/gateway";
import {
  calculateEmbeddingCost,
  EMBEDDING_MODEL,
  MEMORY_EXTRACTION_MODEL,
} from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import {
  calculateCost,
  normalizeUsageTokens,
  type UsageTokenInfo,
} from "@blah-chat/ai/utils";
import {
  conversations,
  createConversationRepository,
  createNeonDatabase,
  memoryEmbeddings,
  type PersistenceDb,
  serializeVector,
  userPreferences,
} from "@blah-chat/persistence-postgres";
import { PREFERENCE_DEFAULTS } from "@blah-chat/shared/preferences";
import {
  buildMemoryExtractionPrompt,
  EXTRACTION_THRESHOLDS,
  estimateTokens,
  type MemoryExtractionLevel,
} from "@blah-chat/shared/prompts";
import { task } from "@trigger.dev/sdk";
import { embedMany, generateObject } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

const EXPIRATION_MS = {
  contextual: 7 * 24 * 60 * 60 * 1000,
  preference: null,
  deadline: null,
  temporary: 1 * 24 * 60 * 60 * 1000,
} as const;

const SIMILARITY_THRESHOLD = 0.85;
const MIN_CONTENT_TOKENS = 100;
const EXTRACTION_WINDOW_LIMIT = 20;
const MEMORY_CONTEXT_LIMIT = 50;

const memorySchema = z.object({
  facts: z.array(
    z.object({
      content: z.string().min(10).max(500),
      category: z.enum([
        "identity",
        "preference",
        "project",
        "context",
        "relationship",
      ]),
      importance: z.number().min(1).max(10),
      reasoning: z.string().min(10).max(300),
      confidence: z.number().min(0).max(1),
      expirationHint: z
        .enum(["contextual", "preference", "deadline", "temporary"])
        .optional(),
    }),
  ),
});

type ExtractedFact = z.infer<typeof memorySchema>["facts"][number];

type GenerateStructuredMemoriesInput = {
  conversationText: string;
  existingMemoriesText: string;
  extractionLevel: MemoryExtractionLevel;
  userId: string;
};

type GenerateStructuredMemoriesResult = {
  facts: ExtractedFact[];
  usage?: UsageTokenInfo | null;
};

type EmbedBatch = (values: string[]) => Promise<number[][]>;

export interface ExtractMemoriesDependencies {
  db?: PersistenceDb;
  now?: () => number;
  generateStructuredMemories?: (
    input: GenerateStructuredMemoriesInput,
  ) => Promise<GenerateStructuredMemoriesResult>;
  embedBatch?: EmbedBatch;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function formatExistingMemories(
  rows: Array<{
    content: string;
    category: string | null;
    metadata: Record<string, unknown> | null;
  }>,
) {
  return rows
    .map((row) => {
      const category =
        typeof row.metadata?.category === "string"
          ? row.metadata.category
          : (row.category ?? "general");
      return `- ${row.content} (${category})`;
    })
    .join("\n");
}

function getExpiresAt(
  now: number,
  expirationHint?: ExtractedFact["expirationHint"],
) {
  if (!expirationHint) {
    return undefined;
  }

  const expirationMs = EXPIRATION_MS[expirationHint];
  return expirationMs ? now + expirationMs : undefined;
}

function createDefaultGenerateStructuredMemories() {
  return async (
    input: GenerateStructuredMemoriesInput,
  ): Promise<GenerateStructuredMemoriesResult> => {
    const result = await generateObject({
      model: getModel(MEMORY_EXTRACTION_MODEL.id),
      schema: memorySchema,
      providerOptions: getGatewayOptions(
        MEMORY_EXTRACTION_MODEL.id,
        input.userId,
        ["memory-extraction"],
      ),
      prompt: buildMemoryExtractionPrompt(
        input.existingMemoriesText,
        input.conversationText,
        input.extractionLevel,
      ),
    });

    return {
      facts: result.object.facts,
      usage:
        ("usage" in result
          ? (result as { usage?: UsageTokenInfo | null }).usage
          : undefined) ?? undefined,
    };
  };
}

function createDefaultEmbedBatch(): EmbedBatch {
  return async (values: string[]) => {
    const result = await embedMany({
      model: EMBEDDING_MODEL,
      values,
    });

    return result.embeddings as number[][];
  };
}

function logModelUsage(input: {
  conversationId: string;
  extractedFacts: number;
  usage?: GenerateStructuredMemoriesResult["usage"];
}) {
  if (!input.usage) {
    return;
  }

  const normalized = normalizeUsageTokens(input.usage);
  const costUsd = calculateCost(MEMORY_EXTRACTION_MODEL.id, normalized);

  console.info("memory extraction model usage", {
    conversationId: input.conversationId,
    modelId: MEMORY_EXTRACTION_MODEL.id,
    extractedFacts: input.extractedFacts,
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    cachedInputTokens: normalized.cachedInputTokens,
    reasoningTokens: normalized.reasoningTokens,
    costUsd,
  });
}

function logEmbeddingUsage(input: {
  conversationId: string;
  factsContent: string[];
}) {
  if (input.factsContent.length === 0) {
    return;
  }

  const tokenCount = input.factsContent.reduce(
    (sum, content) => sum + estimateTokens(content),
    0,
  );

  console.info("memory extraction embedding usage", {
    conversationId: input.conversationId,
    modelId: "openai/text-embedding-3-small",
    tokenCount,
    costUsd: calculateEmbeddingCost(tokenCount),
  });
}

export async function extractMemoriesForConversation(
  payload: { conversationId: string; userId: string },
  dependencies: ExtractMemoriesDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const generateStructuredMemories =
    dependencies.generateStructuredMemories ??
    createDefaultGenerateStructuredMemories();
  const embedBatch = dependencies.embedBatch ?? createDefaultEmbedBatch();

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, payload.conversationId),
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.userId !== payload.userId) {
    throw new Error("Conversation not found");
  }

  const extractionPreference = await db.query.userPreferences.findFirst({
    where: and(
      eq(userPreferences.userId, conversation.userId),
      eq(userPreferences.key, "memoryExtractionLevel"),
    ),
  });

  const extractionLevel = (
    typeof extractionPreference?.value === "string"
      ? extractionPreference.value
      : PREFERENCE_DEFAULTS.memoryExtractionLevel
  ) as MemoryExtractionLevel;

  if (extractionLevel === "none") {
    return { extracted: 0 };
  }

  const activePath = await createConversationRepository(db).getActivePath(
    payload.conversationId,
  );
  const extractionWindow = activePath.slice(-EXTRACTION_WINDOW_LIMIT);

  if (extractionWindow.length === 0) {
    return { extracted: 0 };
  }

  const conversationText = extractionWindow
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  if (
    extractionWindow.length === 1 &&
    (extractionWindow[0]?.content?.trim().length ?? 0) < 20
  ) {
    return { extracted: 0 };
  }

  if (estimateTokens(conversationText) < MIN_CONTENT_TOKENS) {
    return { extracted: 0 };
  }

  const existingMemories = await db.query.memoryEmbeddings.findMany({
    where: eq(memoryEmbeddings.userId, conversation.userId),
    orderBy: desc(memoryEmbeddings.updatedAt),
  });

  const existingMemoriesText = formatExistingMemories(
    existingMemories.slice(0, MEMORY_CONTEXT_LIMIT),
  );

  try {
    const structured = await generateStructuredMemories({
      conversationText,
      existingMemoriesText,
      extractionLevel,
      userId: conversation.userId,
    });

    logModelUsage({
      conversationId: payload.conversationId,
      extractedFacts: structured.facts.length,
      usage: structured.usage,
    });

    if (structured.facts.length === 0) {
      return { extracted: 0 };
    }

    const thresholds = EXTRACTION_THRESHOLDS[extractionLevel];
    const qualityFacts = structured.facts.filter(
      (fact) =>
        fact.importance >= thresholds.importance &&
        fact.confidence >= thresholds.confidence,
    );

    if (qualityFacts.length === 0) {
      return { extracted: 0 };
    }

    const factsContent = qualityFacts.map((fact) => fact.content);
    const embeddings = await embedBatch(factsContent);
    logEmbeddingUsage({
      conversationId: payload.conversationId,
      factsContent,
    });

    const extractedAt = now();
    const sourceMessageId =
      extractionWindow[extractionWindow.length - 1]?.id ?? null;
    let storedCount = 0;

    for (let index = 0; index < qualityFacts.length; index += 1) {
      const fact = qualityFacts[index];
      const embedding = embeddings[index];

      if (!fact || !embedding) {
        continue;
      }

      // Check for duplicate via pgvector cosine distance. The vector literal
      // is passed as a bound parameter (cast server-side), never interpolated.
      const vecLiteral = serializeVector(embedding);
      const duplicateCheck = await db.execute(
        sql`SELECT 1 FROM memory_embeddings
            WHERE user_id = ${conversation.userId}
              AND (1 - (embedding <=> ${vecLiteral}::vector)) > ${SIMILARITY_THRESHOLD}
            LIMIT 1`,
      );

      if (duplicateCheck.rows.length > 0) {
        continue;
      }

      const expiresAt = getExpiresAt(extractedAt, fact.expirationHint);

      const [stored] = await db
        .insert(memoryEmbeddings)
        .values({
          userId: conversation.userId,
          conversationId: payload.conversationId,
          sourceMessageId,
          content: fact.content,
          category: fact.category,
          embedding,
          searchDocument: fact.content,
          metadata: {
            category: fact.category,
            importance: fact.importance,
            reasoning: fact.reasoning,
            confidence: fact.confidence,
            verifiedBy: "auto",
            expiresAt,
            expirationHint: fact.expirationHint,
            version: 1,
            extractedAt,
            sourceConversationId: payload.conversationId,
          },
          createdAt: extractedAt,
          updatedAt: extractedAt,
        })
        .returning();

      if (!stored) {
        throw new Error("Failed to persist extracted memory");
      }

      storedCount += 1;
    }

    return { extracted: storedCount };
  } catch (error) {
    console.error("memory extraction failed", {
      conversationId: payload.conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { extracted: 0 };
  }
}

export const extractMemoriesTask = task({
  id: "extract-memories",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { conversationId: string; userId: string }) => {
    return extractMemoriesForConversation(payload);
  },
});
