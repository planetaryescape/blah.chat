import { normalizeUsageTokens } from "@blah-chat/ai";
import { streamText } from "ai";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { getModel, getModelWithApiKey } from "@/lib/ai/registry";
import type {
  GenerationPromptMessage,
  GenerationProvider,
  GenerationSource,
  GenerationToolCall,
  GenerationUsage,
} from "./types";

function toModelMessages(messages: GenerationPromptMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export class AiSdkGenerationProvider implements GenerationProvider {
  private readonly sourcePromises = new Map<
    string,
    Promise<GenerationSource[]>
  >();
  private readonly toolCallsBySession = new Map<
    string,
    Map<string, GenerationToolCall>
  >();
  private readonly usagePromises = new Map<
    string,
    Promise<GenerationUsage | null>
  >();

  private getSessionKey(input: { requestId: string; sessionId: string }) {
    return `${input.requestId}:${input.sessionId}`;
  }

  private extractProviderSources(
    providerMetadata: unknown,
  ): GenerationSource[] {
    if (!providerMetadata || typeof providerMetadata !== "object") {
      return [];
    }

    const allSources: GenerationSource[] = [];
    const metadata = providerMetadata as Record<string, unknown>;
    const openRouterMeta =
      metadata.openrouter && typeof metadata.openrouter === "object"
        ? (metadata.openrouter as Record<string, unknown>)
        : metadata;
    const perplexityMeta =
      metadata.perplexity && typeof metadata.perplexity === "object"
        ? (metadata.perplexity as Record<string, unknown>)
        : metadata;

    const append = (items: unknown[]) => {
      for (const item of items) {
        if (typeof item === "string") {
          allSources.push({
            position: allSources.length + 1,
            title: item,
            url: item,
          });
          continue;
        }

        if (!item || typeof item !== "object") {
          continue;
        }

        const value = item as Record<string, unknown>;
        const url =
          typeof value.url === "string"
            ? value.url
            : typeof value.uri === "string"
              ? value.uri
              : "";

        if (!url) {
          continue;
        }

        allSources.push({
          position: allSources.length + 1,
          title:
            typeof value.title === "string"
              ? value.title
              : typeof value.name === "string"
                ? value.name
                : url,
          url,
          snippet:
            typeof value.snippet === "string"
              ? value.snippet
              : typeof value.description === "string"
                ? value.description
                : undefined,
          publishedDate:
            typeof value.publishedDate === "string"
              ? value.publishedDate
              : typeof value.date === "string"
                ? value.date
                : undefined,
        });
      }
    };

    if (Array.isArray(openRouterMeta.search_results)) {
      append(openRouterMeta.search_results);
    }
    if (Array.isArray(perplexityMeta.citations)) {
      append(perplexityMeta.citations);
    }
    if (Array.isArray(openRouterMeta.citations)) {
      append(openRouterMeta.citations);
    }
    if (Array.isArray(openRouterMeta.sources)) {
      append(openRouterMeta.sources);
    }
    if (Array.isArray(metadata.citations)) {
      append(metadata.citations);
    }
    if (Array.isArray(metadata.sources)) {
      append(metadata.sources);
    }

    const deduped: GenerationSource[] = [];
    const seen = new Set<string>();
    for (const source of allSources) {
      const normalized = source.url.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      deduped.push({
        ...source,
        position: deduped.length + 1,
      });
    }

    return deduped;
  }

  private upsertToolCall(input: {
    sessionKey: string;
    toolCallId: string;
    toolName: string;
    args?: unknown;
    result?: unknown;
  }) {
    const existingToolCalls =
      this.toolCallsBySession.get(input.sessionKey) ?? new Map();
    const existing = existingToolCalls.get(input.toolCallId);

    existingToolCalls.set(input.toolCallId, {
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      args: input.args ?? existing?.args ?? {},
      result: input.result ?? existing?.result,
      textPosition: existing?.textPosition,
      isPartial: false,
      timestamp: existing?.timestamp ?? Date.now(),
    });

    this.toolCallsBySession.set(input.sessionKey, existingToolCalls);
  }

  async *streamText(input: {
    modelId: string;
    userId: string;
    conversationId: string;
    requestId: string;
    sessionId: string;
    messages: GenerationPromptMessage[];
    tools?: Record<string, unknown>;
    signal?: AbortSignal;
    byokGatewayKey?: string;
  }) {
    const model = input.byokGatewayKey
      ? getModelWithApiKey(input.modelId, input.byokGatewayKey)
      : getModel(input.modelId);
    const result = streamText({
      model,
      messages: toModelMessages(input.messages),
      ...(input.tools ? { tools: input.tools as any } : {}),
      providerOptions: getGatewayOptions(input.modelId, input.userId, [
        "chat",
        "generation-v2",
      ]),
      abortSignal: input.signal,
    });
    const sessionKey = this.getSessionKey(input);
    this.toolCallsBySession.set(sessionKey, new Map());
    this.usagePromises.set(
      sessionKey,
      (async () => {
        try {
          const usage = await result.usage;
          if (!usage) return null;
          const normalized = normalizeUsageTokens(usage);
          return {
            inputTokens: normalized.inputTokens,
            outputTokens: normalized.outputTokens,
            totalTokens: normalized.inputTokens + normalized.outputTokens,
            cachedInputTokens: normalized.cachedInputTokens,
            reasoningTokens: normalized.reasoningTokens,
          };
        } catch {
          return null;
        }
      })(),
    );
    this.sourcePromises.set(
      sessionKey,
      (async () => {
        try {
          const sdkSources = await (
            result as unknown as {
              sources?: PromiseLike<unknown>;
            }
          ).sources;
          if (Array.isArray(sdkSources) && sdkSources.length > 0) {
            const mapped: GenerationSource[] = [];
            for (const [index, source] of sdkSources.entries()) {
              if (!source || typeof source !== "object") {
                continue;
              }

              const value = source as Record<string, unknown>;
              const url =
                typeof value.url === "string"
                  ? value.url
                  : typeof value.uri === "string"
                    ? value.uri
                    : "";
              if (!url) {
                continue;
              }

              mapped.push({
                position: index + 1,
                title:
                  typeof value.title === "string"
                    ? value.title
                    : typeof value.name === "string"
                      ? value.name
                      : url,
                url,
                snippet:
                  typeof value.snippet === "string"
                    ? value.snippet
                    : typeof value.description === "string"
                      ? value.description
                      : undefined,
                publishedDate:
                  typeof value.publishedDate === "string"
                    ? value.publishedDate
                    : typeof value.date === "string"
                      ? value.date
                      : undefined,
              });
            }
            return mapped;
          }
        } catch {
          // fall through to providerMetadata extraction
        }

        try {
          const providerMetadata = await (
            result as unknown as {
              providerMetadata?: PromiseLike<unknown>;
            }
          ).providerMetadata;
          return this.extractProviderSources(providerMetadata);
        } catch {
          return [];
        }
      })(),
    );

    for await (const chunk of result.fullStream) {
      if (chunk.type === "tool-call") {
        this.upsertToolCall({
          sessionKey,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.input,
        });
        continue;
      }

      if (chunk.type === "tool-result") {
        this.upsertToolCall({
          sessionKey,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.input,
          result: chunk.output,
        });
        continue;
      }

      if (chunk.type === "text-delta" && chunk.text.length > 0) {
        yield chunk.text;
      }
    }
  }

  async getToolCalls(input: { requestId: string; sessionId: string }) {
    const sessionKey = this.getSessionKey(input);
    const toolCalls = Array.from(
      this.toolCallsBySession.get(sessionKey)?.values() ?? [],
    );
    this.toolCallsBySession.delete(sessionKey);
    return toolCalls;
  }

  async getSources(input: { requestId: string; sessionId: string }) {
    const sessionKey = this.getSessionKey(input);
    const sources = (await this.sourcePromises.get(sessionKey)) ?? [];
    this.sourcePromises.delete(sessionKey);
    return sources;
  }

  async getUsage(input: {
    requestId: string;
    sessionId: string;
  }): Promise<GenerationUsage | null> {
    const sessionKey = this.getSessionKey(input);
    const usage = (await this.usagePromises.get(sessionKey)) ?? null;
    this.usagePromises.delete(sessionKey);
    return usage;
  }
}
