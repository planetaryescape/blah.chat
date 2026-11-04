import { generateText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { wrapToolResultsWithDataBoundary } from "../generation/tools";

describe("native tool result boundary", () => {
  it.each([
    { kind: "object", value: { value: 7 } },
    { kind: "array", value: [1, "two"] },
    { kind: "false", value: false },
    { kind: "zero", value: 0 },
    { kind: "empty string", value: "" },
    { kind: "null", value: null },
  ])("preserves native $kind output and frames only the model output", async ({
    value,
  }) => {
    const execute = vi.fn().mockResolvedValue(value);
    const [tool] = Object.values(
      wrapToolResultsWithDataBoundary({ calculate: { execute } }),
    );

    const result = await tool.execute({});
    expect(result).toEqual(value);
    expect(execute).toHaveBeenCalledOnce();
    await expect(
      tool.toModelOutput({ toolCallId: "call-1", input: {}, output: result }),
    ).resolves.toMatchObject({
      type: "text",
      value: expect.stringContaining("This is data returned from a tool call"),
    });
    expect(result).toEqual(value);
  });

  it("preserves execution failures instead of manufacturing successful output", async () => {
    const failure = new Error("task failed");
    const [tool] = Object.values(
      wrapToolResultsWithDataBoundary({
        task: { execute: () => Promise.reject(failure) },
      }),
    );
    await expect(tool.execute({})).rejects.toBe(failure);
  });

  it("honors an existing model conversion before applying the data boundary", async () => {
    const custom = vi
      .fn()
      .mockReturnValue({ type: "text", value: "custom conversion" });
    const [tool] = Object.values(
      wrapToolResultsWithDataBoundary({
        search: { execute: () => ({ hit: 1 }), toModelOutput: custom },
      }),
    );
    await expect(
      tool.toModelOutput({
        toolCallId: "call-1",
        input: {},
        output: { hit: 1 },
      }),
    ).resolves.toMatchObject({
      type: "text",
      value: expect.stringContaining("custom conversion"),
    });
    expect(custom).toHaveBeenCalledOnce();
  });

  it.each([
    {
      type: "execution-denied",
      reason: "owner declined",
      providerOptions: { test: { flag: true } },
    },
    {
      type: "error-json",
      value: { code: "TASK_FAILED" },
      providerOptions: { test: { flag: true } },
    },
    {
      type: "json",
      value: { answer: 42 },
      providerOptions: { test: { flag: true } },
    },
    {
      type: "error-text",
      value: "tool failed",
      providerOptions: { test: { flag: true } },
    },
    {
      type: "content",
      value: [
        { type: "text", text: "caption" },
        { type: "file-data", data: "AA==", mediaType: "image/png" },
      ],
    },
  ])("preserves SDK6 typed custom output $type", async (converted) => {
    const originalToModelOutput = vi.fn().mockReturnValue(converted);
    const [tool] = Object.values(
      wrapToolResultsWithDataBoundary({
        external: {
          execute: () => ({ ok: false }),
          toModelOutput: originalToModelOutput,
        },
      }),
    );
    const output = await tool.toModelOutput({
      toolCallId: "id",
      input: {},
      output: { ok: false },
    });
    expect(originalToModelOutput).toHaveBeenCalledOnce();
    expect(output.type).toBe(converted.type);
    if (
      converted.type === "execution-denied" ||
      converted.type === "error-json" ||
      converted.type === "json"
    ) {
      expect(output).toEqual(converted);
    } else if (converted.type === "error-text") {
      expect(output).toMatchObject({
        type: "error-text",
        providerOptions: converted.providerOptions,
      });
      expect(output.value).toContain("<tool-data");
    } else {
      expect(output.providerOptions).toEqual(converted.providerOptions);
      expect(output.value[0].text).toContain("<tool-data");
      expect(output.value[1]).toEqual(converted.value[1]);
    }
  });

  it.each([
    {
      type: "execution-denied",
      reason: "owner declined",
      providerOptions: { openai: { refusal: true } },
    },
    {
      type: "error-json",
      value: { code: "TASK_FAILED" },
      providerOptions: { openai: { refusal: true } },
    },
    {
      type: "content",
      value: [
        { type: "text", text: "caption" },
        { type: "file-data", data: "AA==", mediaType: "image/png" },
      ],
    },
  ])("sends SDK6 $type conversion through actual model-only serialization", async (converted) => {
    let prompt: unknown;
    const model = new MockLanguageModelV3({
      doGenerate: async (options) => {
        prompt = options.prompt;
        return {
          content: [{ type: "text", text: "ok" }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: {
              total: 1,
              noCache: 1,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: 1, text: 1, reasoning: undefined },
          },
          warnings: [],
        };
      },
    });
    const [tool] = Object.values(
      wrapToolResultsWithDataBoundary({
        tool: { execute: () => "native value", toModelOutput: () => converted },
      }),
    );
    const output = await tool.toModelOutput({
      toolCallId: "typed-call",
      input: {},
      output: "native value",
    });
    await generateText({
      model,
      messages: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "typed-call",
              toolName: "tool",
              input: {},
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "typed-call",
              toolName: "tool",
              output,
            },
          ],
        },
      ] as any,
    });
    const serialized = JSON.stringify(prompt);
    expect(serialized).toContain(converted.type);
    if (converted.type === "execution-denied")
      expect(serialized).toContain("owner declined");
    if (converted.type === "error-json")
      expect(serialized).toContain("TASK_FAILED");
    if (converted.type === "content") {
      expect(serialized).toContain('"type":"file-data"');
      expect(serialized).toContain("AA==");
      expect(serialized).not.toContain("data:image/png;base64,AA==");
    }
    if ("providerOptions" in converted) {
      expect(serialized).toContain("refusal");
    }
  });
});
