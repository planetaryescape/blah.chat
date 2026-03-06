import type { ModelMessage } from "ai";
import { format } from "date-fns";
import type { Doc } from "../_generated/dataModel";

type HistoryMessageDoc = Pick<
  Doc<"messages">,
  "_id" | "role" | "content" | "createdAt" | "providerMetadata"
>;

type HistoryAttachmentDoc = Pick<
  Doc<"attachments">,
  "type" | "name" | "mimeType" | "size" | "storageId"
>;

interface SerializeHistoryMessageArgs {
  message: HistoryMessageDoc;
  attachments?: HistoryAttachmentDoc[];
  hasVision: boolean;
  downloadAttachment: (storageId: string) => Promise<string>;
}

interface SerializeConversationHistoryArgs {
  messages: HistoryMessageDoc[];
  attachmentsByMessage: ReadonlyMap<string, HistoryAttachmentDoc[]>;
  hasVision: boolean;
  downloadAttachment: (storageId: string) => Promise<string>;
}

export function formatHistoryTimestamp(createdAt: number): string {
  return `[${format(new Date(createdAt), "MMM d, h:mm a")}] `;
}

function buildAttachmentInfo(attachments: HistoryAttachmentDoc[]): string {
  return attachments
    .map(
      (attachment, index) =>
        `[Attached file ${index}: ${attachment.name} (${attachment.mimeType}, ${Math.round(attachment.size / 1024)}KB)]`,
    )
    .join("\n");
}

export async function serializeHistoryMessage({
  message,
  attachments = [],
  hasVision,
  downloadAttachment,
}: SerializeHistoryMessageArgs): Promise<ModelMessage> {
  const timestamp = formatHistoryTimestamp(message.createdAt);

  if (attachments.length === 0) {
    return {
      role: message.role as "user" | "assistant" | "system",
      content: timestamp + (message.content || ""),
      providerMetadata: message.providerMetadata,
    } as ModelMessage;
  }

  const attachmentInfo = buildAttachmentInfo(attachments);

  if (!hasVision) {
    return {
      role: message.role as "user" | "assistant" | "system",
      content: `${timestamp}${message.content || ""}\n\n${attachmentInfo}`,
      providerMetadata: message.providerMetadata,
    } as ModelMessage;
  }

  const contentParts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
    | {
        type: "file";
        data: string;
        mediaType: string;
        filename: string;
      }
  > = [
    {
      type: "text",
      text: `${timestamp}${message.content || ""}\n\n${attachmentInfo}`,
    },
  ];

  const inlineAttachments = attachments.filter(
    (attachment) =>
      attachment.type === "image" ||
      (attachment.type === "file" && attachment.mimeType === "application/pdf"),
  );

  const downloadResults = await Promise.all(
    inlineAttachments.map(async (attachment) => ({
      attachment,
      base64: await downloadAttachment(attachment.storageId),
    })),
  );

  for (const { attachment, base64 } of downloadResults) {
    if (attachment.type === "image") {
      contentParts.push({
        type: "image",
        image: base64,
      });
      continue;
    }

    if (attachment.type !== "file") {
      continue;
    }

    if (attachment.mimeType === "application/pdf") {
      contentParts.push({
        type: "file",
        data: base64,
        mediaType: attachment.mimeType,
        filename: attachment.name,
      });
      continue;
    }

    if (attachment.type !== "file") {
      continue;
    }

    contentParts.push({
      type: "text",
      text: `\n[Reference: ${attachment.name} (${attachment.mimeType})]`,
    });
  }

  for (const attachment of attachments) {
    if (
      attachment.type !== "file" ||
      attachment.mimeType === "application/pdf"
    ) {
      continue;
    }

    contentParts.push({
      type: "text",
      text: `\n[Reference: ${attachment.name} (${attachment.mimeType})]`,
    });
  }

  return {
    role: message.role as "user" | "assistant" | "system",
    content: contentParts,
    providerMetadata: message.providerMetadata,
  } as ModelMessage;
}

export async function serializeConversationHistory({
  messages,
  attachmentsByMessage,
  hasVision,
  downloadAttachment,
}: SerializeConversationHistoryArgs): Promise<ModelMessage[]> {
  return Promise.all(
    messages.map((message) =>
      serializeHistoryMessage({
        message,
        attachments: attachmentsByMessage.get(message._id as string) || [],
        hasVision,
        downloadAttachment,
      }),
    ),
  );
}
