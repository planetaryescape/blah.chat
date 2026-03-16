import { streamText } from "ai";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { getModel } from "@/lib/ai/registry";
import type { GenerationPromptMessage, GenerationProvider } from "./types";

function toModelMessages(messages: GenerationPromptMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export class AiSdkGenerationProvider implements GenerationProvider {
  async *streamText(input: {
    modelId: string;
    userId: string;
    conversationId: string;
    requestId: string;
    sessionId: string;
    messages: GenerationPromptMessage[];
    signal?: AbortSignal;
  }) {
    const result = streamText({
      model: getModel(input.modelId),
      messages: toModelMessages(input.messages),
      providerOptions: getGatewayOptions(input.modelId, input.userId, [
        "chat",
        "generation-v2",
      ]),
      abortSignal: input.signal,
    });

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta" && chunk.text.length > 0) {
        yield chunk.text;
      }
    }
  }
}
