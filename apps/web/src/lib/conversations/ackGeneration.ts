import { ACK_GENERATION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { generateText } from "ai";
import { CONVERSATION_ACK_PROMPT } from "@/lib/prompts/operational";

const MAX_USER_CHARS = 4000;
const ACK_TIMEOUT_MS = 5000;

function abortableTimeout(ms: number): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

/**
 * Produce a one-sentence acknowledgement of the user's message using a
 * small/fast model. Returns null on timeout or error — callers should
 * treat the ack as best-effort.
 */
export async function generateConversationAck(userMessage: string): Promise<{
  text: string;
  modelId: string;
} | null> {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const { signal, cancel } = abortableTimeout(ACK_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: getModel(ACK_GENERATION_MODEL.id),
      prompt: `${CONVERSATION_ACK_PROMPT}\n\nUser message:\n${trimmed.slice(0, MAX_USER_CHARS)}`,
      abortSignal: signal,
    });
    const text = result.text.trim();
    if (!text) return null;
    return { text, modelId: ACK_GENERATION_MODEL.id };
  } catch (error) {
    console.warn("ack generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    cancel();
  }
}
