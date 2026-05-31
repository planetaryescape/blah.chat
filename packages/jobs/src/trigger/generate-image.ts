import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { buildReasoningOptions } from "@blah-chat/ai/reasoning";
import { getModel } from "@blah-chat/ai/registry";
import {
  calculateCost,
  getModelConfig,
  normalizeUsageTokens,
  type UsageTokenInfo,
} from "@blah-chat/ai/utils";
import {
  attachments,
  buildGeneratedAttachmentObjectKey,
  conversations,
  createNeonDatabase,
  createR2Client,
  createSignedReadUrl,
  createUsageRecordRepository,
  messages,
  type PersistenceDb,
  parsePersistenceEnv,
  uploadObject,
} from "@blah-chat/persistence-postgres";
import { IMAGE_GENERATION_SYSTEM_PROMPT } from "@blah-chat/shared/prompts";
import { task } from "@trigger.dev/sdk";
import { streamText } from "ai";
import { and, eq } from "drizzle-orm";

type ThinkingEffort = "none" | "low" | "medium" | "high";

type GeneratedImage = {
  bytes: Uint8Array;
  mimeType: string;
  usage?: UsageTokenInfo | null;
  reasoning?: string;
  generationTime?: number;
};

type UploadImageInput = {
  bucket: string;
  key: string;
  contentType: string;
  body: Uint8Array;
};

type CreateImage = (input: {
  prompt: string;
  modelId: string;
  userId: string;
  thinkingEffort?: ThinkingEffort;
  referenceImageBase64?: string;
}) => Promise<GeneratedImage>;

type LoadReferenceImage = (input: { storageId: string }) => Promise<string>;

export interface GenerateImageDependencies {
  db?: PersistenceDb;
  now?: () => number;
  bucket?: string;
  createImage?: CreateImage;
  uploadImage?: (input: UploadImageInput) => Promise<void>;
  loadReferenceImage?: LoadReferenceImage;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function createDefaultLoadReferenceImage(): LoadReferenceImage {
  return async ({ storageId }) => {
    const env = parsePersistenceEnv(process.env);
    const client = createR2Client(env);
    const signedUrl = await createSignedReadUrl({
      client,
      bucket: env.r2.bucket,
      key: storageId,
    });
    const response = await fetch(signedUrl, {
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch reference image from storage (${response.status})`,
      );
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = response.headers.get("Content-Type") || "image/png";
    return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  };
}

function createDefaultUploadImage(): NonNullable<
  GenerateImageDependencies["uploadImage"]
> {
  return async (input) => {
    const env = parsePersistenceEnv(process.env);
    const client = createR2Client(env);

    await uploadObject({
      client,
      bucket: input.bucket,
      key: input.key,
      body: input.body,
      contentType: input.contentType,
    });
  };
}

function createDefaultCreateImage(): CreateImage {
  return async (input) => {
    const startedAt = Date.now();
    const modelConfig = getModelConfig(input.modelId);
    if (!modelConfig) {
      throw new Error(`Model ${input.modelId} not found in config`);
    }

    const reasoningResult =
      input.thinkingEffort && modelConfig.reasoning
        ? buildReasoningOptions(modelConfig, input.thinkingEffort)
        : null;

    const content: Array<{
      type: "text" | "image";
      text?: string;
      image?: string;
    }> = [
      {
        type: "text",
        text: `${input.prompt}\n\nIMPORTANT: Return the result as a Base64 encoded string of the image. Do not include any markdown formatting or prefixes. Just the raw base64 string.`,
      },
    ];

    if (input.referenceImageBase64) {
      content.push({
        type: "image",
        image: input.referenceImageBase64,
      });
    }

    const result = streamText({
      model: getModel(input.modelId),
      system: IMAGE_GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: content as any,
        },
      ],
      providerOptions: {
        ...getGatewayOptions(input.modelId, input.userId, ["image-generation"]),
        ...(reasoningResult?.providerOptions || {}),
      },
    });

    let accumulated = "";
    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        accumulated += chunk.text;
      }
    }

    const reasoningOutputs = await result.reasoning;
    const files = await result.files;
    let imageBytes: Uint8Array | null = null;

    if (files && files.length > 0) {
      const file = files[0];
      if ((file as any)?.uint8Array) {
        imageBytes = new Uint8Array((file as any).uint8Array);
      } else if ((file as any)?.base64Data) {
        imageBytes = Uint8Array.from(
          Buffer.from((file as any).base64Data, "base64"),
        );
      }
    }

    if (!imageBytes) {
      let cleanText = accumulated
        .replace(/```/g, "")
        .replace(/^base64\n/, "")
        .replace(/\n/g, "")
        .trim();

      if (cleanText.includes(" ")) {
        const base64Match = cleanText.match(/([A-Za-z0-9+/]{100,}={0,2})/);
        if (base64Match) {
          cleanText = base64Match[0];
        }
      }

      if (cleanText.length <= 100 || cleanText.includes(" ")) {
        throw new Error("Invalid base64 response from model");
      }

      imageBytes = Uint8Array.from(Buffer.from(cleanText, "base64"));
    }

    return {
      bytes: imageBytes,
      mimeType: "image/png",
      usage: normalizeUsageTokens(await result.usage),
      reasoning:
        reasoningOutputs && reasoningOutputs.length > 0
          ? reasoningOutputs.map((entry) => entry.text).join("\n")
          : undefined,
      generationTime: Date.now() - startedAt,
    };
  };
}

function inferGeneratedFileName(mimeType: string) {
  if (mimeType === "image/jpeg") return "generated-image.jpg";
  if (mimeType === "image/webp") return "generated-image.webp";
  return "generated-image.png";
}

async function recordUsage(input: {
  db: PersistenceDb;
  conversationId: string;
  messageId: string;
  userId: string;
  modelId: string;
  usage?: UsageTokenInfo | null;
}) {
  if (!input.usage) {
    return;
  }

  const normalized = normalizeUsageTokens(input.usage);
  const costUsd = calculateCost(input.modelId, normalized);

  await createUsageRecordRepository(input.db).recordImageGeneration({
    userId: input.userId,
    conversationId: input.conversationId,
    model: input.modelId,
    cost: costUsd,
    feature: "chat",
  });

  console.info("image generation usage", {
    conversationId: input.conversationId,
    messageId: input.messageId,
    userId: input.userId,
    modelId: input.modelId,
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    cachedInputTokens: normalized.cachedInputTokens,
    reasoningTokens: normalized.reasoningTokens,
    costUsd,
  });
}

export async function generateImageForMessage(
  payload: {
    userId: string;
    conversationId: string;
    messageId: string;
    prompt: string;
    model?: string;
    referenceImageStorageId?: string;
    thinkingEffort?: string;
  },
  dependencies: GenerateImageDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const createImage = dependencies.createImage ?? createDefaultCreateImage();
  const uploadImage = dependencies.uploadImage ?? createDefaultUploadImage();
  const loadReferenceImage =
    dependencies.loadReferenceImage ?? createDefaultLoadReferenceImage();
  const bucket =
    dependencies.bucket ?? parsePersistenceEnv(process.env).r2.bucket;
  const modelId = payload.model || "google:gemini-3-pro-image-preview";
  const thinkingEffort =
    payload.thinkingEffort === "none" ||
    payload.thinkingEffort === "low" ||
    payload.thinkingEffort === "medium" ||
    payload.thinkingEffort === "high"
      ? payload.thinkingEffort
      : undefined;

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, payload.conversationId),
  });

  if (!conversation) {
    return { success: true, skipped: "conversation_not_found" as const };
  }

  if (conversation.userId !== payload.userId) {
    return { success: true, skipped: "unauthorized" as const };
  }

  const assistantMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, payload.messageId),
      eq(messages.conversationId, payload.conversationId),
    ),
  });

  if (!assistantMessage || assistantMessage.role !== "assistant") {
    return { success: true, skipped: "message_not_found" as const };
  }

  let referenceImageBase64: string | undefined;
  if (payload.referenceImageStorageId) {
    if (
      !payload.referenceImageStorageId.startsWith(
        `users/${conversation.userId}/`,
      )
    ) {
      return { success: true, skipped: "reference_image_not_found" as const };
    }

    referenceImageBase64 = await loadReferenceImage({
      storageId: payload.referenceImageStorageId,
    });
  }

  const generated = await createImage({
    prompt: payload.prompt,
    modelId,
    userId: conversation.userId,
    thinkingEffort,
    referenceImageBase64,
  });

  const fileName = inferGeneratedFileName(generated.mimeType);
  const key = buildGeneratedAttachmentObjectKey({
    userId: conversation.userId,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    fileName,
  });

  await uploadImage({
    bucket,
    key,
    contentType: generated.mimeType,
    body: generated.bytes,
  });

  const timestamp = now();

  await db.insert(attachments).values({
    messageId: payload.messageId,
    conversationId: payload.conversationId,
    userId: conversation.userId,
    type: "image",
    key,
    bucket,
    name: fileName,
    mimeType: generated.mimeType,
    size: generated.bytes.byteLength,
    metadata: {
      prompt: payload.prompt,
      model: modelId,
      generationTime: generated.generationTime,
    },
    createdAt: timestamp,
  });

  await db
    .update(messages)
    .set({
      content: `Generated image: ${payload.prompt}`,
      status: "complete",
      model: modelId,
      updatedAt: timestamp,
    })
    .where(eq(messages.id, payload.messageId));

  await recordUsage({
    db,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    userId: conversation.userId,
    modelId,
    usage: generated.usage,
  });

  return {
    success: true,
    storageId: key,
    generationTime: generated.generationTime,
  };
}

export const generateImageTask = task({
  id: "generate-image",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    userId: string;
    conversationId: string;
    messageId: string;
    prompt: string;
    model?: string;
    referenceImageStorageId?: string;
    thinkingEffort?: string;
  }) => {
    return generateImageForMessage(payload);
  },
});
