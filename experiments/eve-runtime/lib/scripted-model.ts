import { randomUUID } from "node:crypto";
import { MockLanguageModelV3 } from "ai/test";
import { trialModel } from "./model.ts";

type Options = Parameters<MockLanguageModelV3["doStream"]>[0];
type StreamResult = Awaited<ReturnType<MockLanguageModelV3["doStream"]>>;
type Part = StreamResult["stream"] extends ReadableStream<infer T> ? T : never;

// Scripted decisions, REAL Eve workflow/tool/approval/stream execution.
// V3 deliberately exercises the model protocol used by the app's AI SDK 6.
export function scriptedModel() {
  return new MockLanguageModelV3({
    provider: "blah-chat-scripted-fixture",
    modelId: trialModel().id,
    doStream: async ({ prompt }: Options): Promise<StreamResult> => {
      const markerIndex = prompt.findLastIndex(
        (message) =>
          message.role === "user" &&
          JSON.stringify(message.content).includes("SPIKE:"),
      );
      const message = JSON.stringify(prompt[markerIndex]?.content);
      const results = prompt
        .slice(markerIndex + 1)
        .filter((entry) => entry.role === "tool")
        .flatMap((entry) => entry.content);
      let call:
        | { toolName: string; input: Record<string, string | number> }
        | undefined;
      if (results.length === 0) {
        if (message?.includes("SPIKE:cost")) {
          call = {
            toolName: "quote_cost",
            input: { inputTokens: 1000, outputTokens: 200 },
          };
        } else if (message?.includes("SPIKE:approve")) {
          call = {
            toolName: "record_decision",
            input: {
              operationId: "decision-1",
              decision: "Evaluate Eve behind an adapter",
            },
          };
        } else if (message?.includes("SPIKE:sandbox")) {
          call = {
            toolName: "bash",
            input: {
              command:
                "printf 'sandbox-ok' > /workspace/probe.txt; cat /workspace/probe.txt",
            },
          };
        } else if (message?.includes("SPIKE:read")) {
          call = {
            toolName: "bash",
            input: { command: "cat /workspace/probe.txt" },
          };
        } else if (message?.includes("SPIKE:slow")) {
          call = { toolName: "slow_probe", input: {} };
        }
      }
      const parts: Part[] = [{ type: "stream-start", warnings: [] }];
      if (call) {
        parts.push({
          type: "tool-call",
          toolCallId: randomUUID(),
          toolName: call.toolName,
          input: JSON.stringify(call.input),
        });
      } else {
        const text = results.length
          ? JSON.stringify(results)
          : "Streaming survived the client disconnect.";
        parts.push({ type: "text-start", id: "reply" });
        for (const delta of text.match(/.{1,20}/gs) ?? []) {
          parts.push({ type: "text-delta", id: "reply", delta });
        }
        parts.push({ type: "text-end", id: "reply" });
      }
      parts.push({
        type: "finish",
        finishReason: {
          unified: call ? "tool-calls" : "stop",
          raw: undefined,
        },
        usage: {
          inputTokens: {
            total: 100,
            noCache: 100,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: { total: 20, text: 20, reasoning: 0 },
        },
      });
      let index = 0;
      return {
        stream: new ReadableStream<Part>({
          async pull(controller) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            const part = parts[index++];
            if (part) controller.enqueue(part);
            else controller.close();
          },
        }),
      };
    },
  });
}
