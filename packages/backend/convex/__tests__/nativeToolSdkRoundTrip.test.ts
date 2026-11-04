import { generateText, streamText, tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { wrapToolResultsWithDataBoundary } from "../generation/tools";

it("uses real SDK streaming to keep native execution separate from continuation messages", async () => {
  const native = { success: true, value: 42, sources: ["source-1"] };
  const execute = vi.fn().mockResolvedValue(native);
  const tools = wrapToolResultsWithDataBoundary({
    calculator: tool({
      inputSchema: z.object({ expression: z.string() }),
      execute,
    }),
  });
  const usage = {
    inputTokens: {
      total: 1,
      noCache: 1,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  };
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({
            type: "tool-call",
            toolCallId: "real-sdk-call",
            toolName: "calculator",
            input: JSON.stringify({ expression: "6 * 7" }),
          });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "tool-calls", raw: undefined },
            usage,
          });
          controller.close();
        },
      }),
    }),
    doGenerate: async ({ prompt }) => {
      const result = prompt
        .filter((message) => message.role === "tool")
        .flatMap((message) => message.content)
        .find((part) => part.type === "tool-result");
      expect(result).toMatchObject({
        type: "tool-result",
        toolCallId: "real-sdk-call",
        toolName: "calculator",
        output: { type: "text" },
      });
      if (result?.type !== "tool-result" || result.output.type !== "text") {
        throw new Error("SDK continuation lost the tool result");
      }
      const output = result.output.value;
      expect(output).toContain("This is data returned from a tool call");
      expect(output).toContain(JSON.stringify(native));
      const value = JSON.parse(output.split("\n")[1]).value;
      return {
        content: [{ type: "text", text: `The result is ${value}.` }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
  const messages = [{ role: "user" as const, content: "Calculate 6 * 7." }];
  const stream = streamText({ model, tools, messages });
  const outcomes = [];
  for await (const part of stream.fullStream) {
    if (part.type === "error") throw part.error;
    if (part.type === "tool-result") outcomes.push(part);
  }
  expect(outcomes).toHaveLength(1);
  expect(outcomes[0]).toMatchObject({
    toolCallId: "real-sdk-call",
    output: native,
  });
  expect(execute).toHaveBeenCalledOnce();
  const continuation = await generateText({
    model,
    messages: [...messages, ...(await stream.response).messages],
  });
  expect(continuation.text).toBe("The result is 42.");
  expect(execute).toHaveBeenCalledOnce();
  expect(native).toEqual({ success: true, value: 42, sources: ["source-1"] });
});
