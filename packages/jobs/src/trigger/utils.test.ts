import { beforeEach, describe, expect, it, vi } from "vitest";
import { callLegacyConvexTrigger } from "./utils";

describe("callLegacyConvexTrigger", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_CONVEX_URL =
      "https://happy-animal-123.convex.cloud";
    process.env.TRIGGER_CONVEX_SECRET = "convex-secret";

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("calls the legacy Convex trigger endpoint directly", async () => {
    await callLegacyConvexTrigger("generate-image", {
      conversationId: "conv_123",
      messageId: "msg_123",
      prompt: "A repair bot rebuilding the Postgres runtime",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://happy-animal-123.convex.site/trigger/generate-image",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer convex-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "conv_123",
          messageId: "msg_123",
          prompt: "A repair bot rebuilding the Postgres runtime",
        }),
      }),
    );
  });
});
