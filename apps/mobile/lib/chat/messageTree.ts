import type { GenerationStreamEvent } from "@blah-chat/api-client";
import type { Doc, Id } from "@/lib/convex";

type Message = Doc<"messages">;

type PendingMessageInput = {
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[];
  clientMessageId: string;
  createdAt: number;
};

function createLocalMessageId(
  prefix: "user" | "assistant",
  clientMessageId: string,
) {
  return `local-${prefix}-${clientMessageId}` as Id<"messages">;
}

export function sortMessages(messages: Message[]) {
  return [...messages].sort((left, right) => {
    const leftCreatedAt = left.createdAt ?? left._creationTime ?? 0;
    const rightCreatedAt = right.createdAt ?? right._creationTime ?? 0;
    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    const leftSibling =
      typeof left.siblingIndex === "number" ? left.siblingIndex : 0;
    const rightSibling =
      typeof right.siblingIndex === "number" ? right.siblingIndex : 0;
    if (leftSibling !== rightSibling) {
      return leftSibling - rightSibling;
    }

    return String(left._id).localeCompare(String(right._id));
  });
}

export function addPendingMessagePair(
  messages: Message[],
  input: PendingMessageInput,
) {
  const baseCreatedAt = input.createdAt;
  const assistantModel = input.modelId ?? input.models?.[0];
  return sortMessages([
    ...messages,
    {
      _id: createLocalMessageId("user", input.clientMessageId),
      _creationTime: baseCreatedAt,
      conversationId: input.conversationId as Id<"conversations">,
      userId: "me" as Id<"users">,
      role: "user",
      content: input.content,
      clientMessageId: input.clientMessageId,
      status: "complete",
      createdAt: baseCreatedAt,
      updatedAt: baseCreatedAt,
      siblingIndex: 0,
      isActiveBranch: true,
    } satisfies Message,
    {
      _id: createLocalMessageId("assistant", input.clientMessageId),
      _creationTime: baseCreatedAt + 1,
      conversationId: input.conversationId as Id<"conversations">,
      userId: "assistant" as Id<"users">,
      role: "assistant",
      content: "",
      clientMessageId: input.clientMessageId,
      status: "pending",
      model: assistantModel,
      createdAt: baseCreatedAt + 1,
      updatedAt: baseCreatedAt + 1,
      siblingIndex: 0,
      isActiveBranch: true,
    } satisfies Message,
  ]);
}

export function applyGenerationEventToMessages(
  messages: Message[],
  conversationId: Id<"conversations"> | string,
  event: GenerationStreamEvent,
) {
  const index = messages.findIndex(
    (message) => String(message._id) === event.assistantMessageId,
  );
  const existing = index === -1 ? undefined : messages[index];
  const base =
    existing ??
    ({
      _id: event.assistantMessageId as Id<"messages">,
      _creationTime: event.ts,
      conversationId: conversationId as Id<"conversations">,
      userId: "assistant" as Id<"users">,
      role: "assistant",
      content: "",
      status: "pending",
      model: event.modelId,
      createdAt: event.ts,
      updatedAt: event.ts,
      siblingIndex: 0,
      isActiveBranch: true,
    } satisfies Message);
  const currentContent = base.partialContent ?? base.content;

  let nextMessage: Message = {
    ...base,
    model: event.modelId,
    updatedAt: event.ts,
  };

  switch (event.type) {
    case "start":
      nextMessage = {
        ...nextMessage,
        status: "generating",
        partialContent: currentContent || undefined,
      };
      break;
    case "delta": {
      const nextContent = `${currentContent}${event.delta ?? ""}`;
      nextMessage = {
        ...nextMessage,
        content: nextContent,
        partialContent: nextContent,
        status: "generating",
      };
      break;
    }
    case "checkpoint":
      nextMessage = {
        ...nextMessage,
        content: event.content ?? currentContent,
        partialContent: event.content ?? currentContent,
        status: "generating",
      };
      break;
    case "complete":
      nextMessage = {
        ...nextMessage,
        content: event.content ?? currentContent,
        partialContent: undefined,
        status: "complete",
      };
      break;
    case "cancelled":
      nextMessage = {
        ...nextMessage,
        status: "stopped",
        partialContent: undefined,
      };
      break;
    case "error":
      nextMessage = {
        ...nextMessage,
        status: "error",
        partialContent: undefined,
      };
      break;
  }

  const nextMessages = [...messages];
  if (index === -1) {
    nextMessages.push(nextMessage);
  } else {
    nextMessages[index] = nextMessage;
  }

  return sortMessages(nextMessages);
}

export function replaceConversationIdInMessages(
  messages: Message[],
  currentConversationId: string,
  nextConversationId: string,
) {
  return messages.map((message) =>
    message.conversationId === currentConversationId
      ? {
          ...message,
          conversationId: nextConversationId as Id<"conversations">,
        }
      : message,
  );
}

export function deriveMessageSiblings(messages: Message[], messageId: string) {
  const message = messages.find((candidate) => candidate._id === messageId);
  const parentMessageId = message?.parentMessageIds?.[0];
  if (!message || !parentMessageId) {
    return [];
  }

  return sortMessages(
    messages.filter(
      (candidate) => candidate.parentMessageIds?.[0] === parentMessageId,
    ),
  );
}

export function filterActiveBranchMessages(messages: Message[] | undefined) {
  if (!messages) {
    return messages;
  }

  return messages.filter((message) => message.isActiveBranch !== false);
}
