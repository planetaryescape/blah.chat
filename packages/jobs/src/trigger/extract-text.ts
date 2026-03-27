import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { DOCUMENT_EXTRACTION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { normalizeUsageTokens, type UsageTokenInfo } from "@blah-chat/ai/utils";
import {
  type Attachment,
  attachments,
  createNeonDatabase,
  createR2Client,
  createSignedReadUrl,
  type PersistenceDb,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import {
  buildPdfPageExtractionPrompt,
  DOCUMENT_EXTRACTION_PROMPT,
} from "@blah-chat/shared/prompts";
import { task } from "@trigger.dev/sdk";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { embedAttachmentFile } from "./embed-file";

const TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/javascript",
  "application/typescript",
  "text/javascript",
  "text/typescript",
  "text/css",
  "text/html",
  "application/json",
  "text/csv",
  "text/xml",
  "application/xml",
] as const;

const PDF_TYPES = ["application/pdf"] as const;

const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

type ExtractAttachmentResult = {
  extractedText?: string;
  success: boolean;
};

type ExtractDocumentText = (input: {
  blob: Blob;
  fileName: string;
  mimeType: string;
  userId: string;
}) => Promise<{ text: string; usage?: UsageTokenInfo | null }>;

export interface ExtractTextDependencies {
  db?: PersistenceDb;
  now?: () => number;
  downloadAttachment?: (attachment: Attachment) => Promise<Blob>;
  extractDocumentText?: ExtractDocumentText;
  embedAttachment?: (input: { attachmentId: string }) => Promise<void>;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function isTextLikeMimeType(mimeType: string) {
  return (
    TEXT_TYPES.some((type) => mimeType.includes(type)) ||
    mimeType.startsWith("text/")
  );
}

function isPdfMimeType(mimeType: string) {
  return PDF_TYPES.includes(mimeType as (typeof PDF_TYPES)[number]);
}

function isDocxMimeType(mimeType: string) {
  return DOCX_TYPES.includes(mimeType as (typeof DOCX_TYPES)[number]);
}

function logExtractionUsage(input: {
  attachmentId: string;
  usage?: UsageTokenInfo | null;
}) {
  if (!input.usage) {
    return;
  }

  const normalized = normalizeUsageTokens(input.usage);

  console.info("attachment extraction usage", {
    attachmentId: input.attachmentId,
    modelId: DOCUMENT_EXTRACTION_MODEL.id,
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    cachedInputTokens: normalized.cachedInputTokens,
    reasoningTokens: normalized.reasoningTokens,
  });
}

function createDefaultDownloadAttachment(
  db: PersistenceDb,
): (attachment: Attachment) => Promise<Blob> {
  return async (attachment) => {
    const env = parsePersistenceEnv(process.env);
    const r2 = createR2Client(env);
    const readUrl = await createSignedReadUrl({
      client: r2,
      bucket: attachment.bucket,
      key: attachment.key,
    });
    const response = await fetch(readUrl, {
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch attachment from storage (${response.status})`,
      );
    }

    const mimeType =
      response.headers.get("Content-Type") || attachment.mimeType;
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], {
      type: mimeType,
    });
  };
}

async function extractPdfWithLlm(input: {
  blob: Blob;
  userId: string;
}): Promise<{ text: string; usage?: UsageTokenInfo | null }> {
  const arrayBuffer = await input.blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const estimatedPages = Math.max(
    1,
    Math.ceil(arrayBuffer.byteLength / 50_000),
  );
  const maxPages = Math.min(estimatedPages, 100);
  const extractedPages: string[] = [];
  let lastUsage: UsageTokenInfo | null | undefined;

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const result = await generateText({
      model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
      providerOptions: getGatewayOptions(
        DOCUMENT_EXTRACTION_MODEL.id,
        input.userId,
        ["document-extraction"],
      ),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: base64,
              mediaType: "application/pdf",
            },
            {
              type: "text",
              text: buildPdfPageExtractionPrompt(pageNum, maxPages),
            },
          ],
        },
      ],
      maxOutputTokens: 16_000,
    });

    lastUsage = result.usage;
    const pageText = result.text.trim();
    if (pageText === "[BLANK PAGE]" || pageText.length < 10) {
      if (extractedPages.length > 0) {
        break;
      }
    }

    extractedPages.push(`--- Page ${pageNum} ---\n${pageText}`);
  }

  return {
    text: extractedPages.join("\n\n").trim(),
    usage: lastUsage,
  };
}

async function extractDocumentWithLlm(input: {
  blob: Blob;
  mimeType: string;
  userId: string;
}): Promise<{ text: string; usage?: UsageTokenInfo | null }> {
  const arrayBuffer = await input.blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const result = await generateText({
    model: getModel(DOCUMENT_EXTRACTION_MODEL.id),
    providerOptions: getGatewayOptions(
      DOCUMENT_EXTRACTION_MODEL.id,
      input.userId,
      ["document-extraction"],
    ),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: base64,
            mediaType: input.mimeType,
          },
          {
            type: "text",
            text: DOCUMENT_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    maxOutputTokens: 32_000,
  });

  return {
    text: result.text.trim(),
    usage: result.usage,
  };
}

function createDefaultExtractDocumentText(): ExtractDocumentText {
  return async (input) => {
    const mimeType = input.mimeType.toLowerCase();

    if (isTextLikeMimeType(mimeType)) {
      return {
        text: await input.blob.text(),
      };
    }

    if (isPdfMimeType(mimeType)) {
      return extractPdfWithLlm({
        blob: input.blob,
        userId: input.userId,
      });
    }

    if (isDocxMimeType(mimeType)) {
      return extractDocumentWithLlm({
        blob: input.blob,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        userId: input.userId,
      });
    }

    return extractDocumentWithLlm({
      blob: input.blob,
      mimeType,
      userId: input.userId,
    });
  };
}

export async function extractDocumentBlobText(input: {
  blob: Blob;
  fileName: string;
  mimeType: string;
  userId: string;
}) {
  const extractDocumentText = createDefaultExtractDocumentText();
  return extractDocumentText(input);
}

async function updateAttachmentExtraction(input: {
  attachmentId: string;
  db: PersistenceDb;
  extractedAt: number;
  extractedText?: string;
  extractionError?: string | null;
}) {
  await input.db
    .update(attachments)
    .set({
      extractedText: input.extractedText,
      extractionError: input.extractionError ?? null,
      extractedAt: input.extractedAt,
    })
    .where(eq(attachments.id, input.attachmentId));
}

export async function extractTextForAttachment(
  payload: {
    attachmentId: string;
    storageId: string;
    fileName: string;
    mimeType: string;
  },
  dependencies: ExtractTextDependencies = {},
): Promise<ExtractAttachmentResult> {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, payload.attachmentId),
  });

  if (!attachment) {
    return { success: false };
  }

  const downloadAttachment =
    dependencies.downloadAttachment ?? createDefaultDownloadAttachment(db);
  const extractDocumentText =
    dependencies.extractDocumentText ?? createDefaultExtractDocumentText();
  const embedAttachment =
    dependencies.embedAttachment ??
    (async (input: { attachmentId: string }) => {
      await embedAttachmentFile(
        { attachmentId: input.attachmentId },
        {
          db,
          now,
        },
      );
    });

  try {
    const blob = await downloadAttachment(attachment);
    const result = await extractDocumentText({
      blob,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      userId: attachment.userId,
    });
    const extractedText = result.text.trim();

    await updateAttachmentExtraction({
      attachmentId: attachment.id,
      db,
      extractedAt: now(),
      extractedText,
      extractionError: null,
    });
    await embedAttachment({ attachmentId: attachment.id });
    logExtractionUsage({
      attachmentId: attachment.id,
      usage: result.usage,
    });

    return {
      success: true,
      extractedText,
    };
  } catch (error) {
    await updateAttachmentExtraction({
      attachmentId: attachment.id,
      db,
      extractedAt: now(),
      extractionError:
        error instanceof Error ? error.message : "Attachment extraction failed",
    });

    return {
      success: false,
    };
  }
}

export const extractTextTask = task({
  id: "extract-text",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    attachmentId: string;
    storageId: string;
    fileName: string;
    mimeType: string;
  }) => {
    return extractTextForAttachment(payload);
  },
});
