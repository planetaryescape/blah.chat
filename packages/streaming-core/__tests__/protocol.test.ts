import {
  formatGenerationSseEvent,
  generationCancelKey,
  generationEventStreamKey,
  generationRequestMetaKey,
  generationSessionStateKey,
  parseGenerationEvent,
} from "../src/index";

describe("generation event protocol", () => {
  test("parses a valid delta event", () => {
    const event = parseGenerationEvent({
      type: "delta",
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_1",
      modelId: "openai:gpt-5-mini",
      seq: 4,
      ts: 1_763_623_100_000,
      delta: "hello",
    });

    expect(event.type).toBe("delta");
    if (event.type !== "delta") {
      throw new Error("expected delta event");
    }
    expect(event.delta).toBe("hello");
  });

  test("rejects an invalid event", () => {
    expect(() =>
      parseGenerationEvent({
        type: "delta",
        requestId: "req_1",
        sessionId: "sess_1",
        assistantMessageId: "msg_1",
        modelId: "openai:gpt-5-mini",
        ts: 1_763_623_100_000,
        delta: "missing seq",
      }),
    ).toThrow();
  });

  test("builds deterministic Redis keys", () => {
    expect(generationEventStreamKey("req_123")).toBe(
      "generation:req_123:events",
    );
    expect(generationCancelKey("req_123")).toBe("generation:req_123:cancel");
    expect(generationRequestMetaKey("req_123")).toBe("generation:req_123:meta");
    expect(generationSessionStateKey("sess_456")).toBe(
      "generation-session:sess_456:state",
    );
  });

  test("formats SSE payloads", () => {
    const formatted = formatGenerationSseEvent(
      parseGenerationEvent({
        type: "complete",
        requestId: "req_1",
        sessionId: "sess_1",
        assistantMessageId: "msg_1",
        modelId: "openai:gpt-5-mini",
        seq: 99,
        ts: 1_763_623_100_000,
        content: "done",
      }),
    );

    expect(formatted).toContain("event: generation");
    expect(formatted).toContain('"type":"complete"');
    expect(formatted.endsWith("\n\n")).toBe(true);
  });
});
