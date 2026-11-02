import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { createBlahClient } from "@blah-chat/api-client";
import { sendMessage } from "../src/lib/mutations";
import { listMessages } from "../src/lib/queries";

describe("active CLI HTTP/SSE transport", () => {
  test("root chat uses ChatView -> useMessages, not an unmounted Convex provider", async () => {
    const root = await readFile(
      new URL("../src/commands/chat.tsx", import.meta.url),
      "utf8",
    );
    const view = await readFile(
      new URL("../src/components/ChatView.tsx", import.meta.url),
      "utf8",
    );
    const hook = await readFile(
      new URL("../src/hooks/useMessages.ts", import.meta.url),
      "utf8",
    );
    expect(root).toContain("<ChatView");
    expect(view).toContain("useMessages(");
    expect(hook).toContain("client.streamCliMessages(id");
    expect(root).not.toContain("ConvexProvider");
  });

  test("reads, sends and SSE all use one app URL and scoped API key", async () => {
    const requests: { url: string; key: string | null; body: string | null }[] =
      [];
    const client = createBlahClient({
      baseUrl: "https://example.test/",
      apiKey: "synthetic-test-key",
      // SAFETY: synthetic fetch implements the SDK's request/response contract;
      // the SDK does not use Bun's optional fetch.preconnect extension.
      fetch: (async (request: Request | string | URL, init?: RequestInit) => {
        const req =
          request instanceof Request ? request : new Request(request, init);
        requests.push({
          url: req.url,
          key: req.headers.get("x-api-key"),
          body: req.method === "POST" ? await req.text() : null,
        });
        if (req.url.includes("/stream/")) {
          return new Response('event: snapshot\ndata: {"messages":[]}\n\n', {
            headers: { "Content-Type": "text/event-stream" },
          });
        }
        return Response.json({
          status: "success",
          data:
            req.method === "POST" && requests.length === 1
              ? []
              : { userMessageId: "m1" },
        });
      }) as typeof fetch,
    });
    expect(await listMessages(client, "synthetic-test-key", "c1")).toEqual([]);
    expect(
      await sendMessage(client, "synthetic-test-key", {
        conversationId: "c1",
        content: "hello",
      }),
    ).toEqual({ userMessageId: "m1" });
    for await (const event of client.streamCliMessages("c1")) {
      expect(event.event).toBe("snapshot");
      break;
    }
    expect(requests).toHaveLength(3);
    expect(
      requests.every(
        (request) =>
          request.url.startsWith("https://example.test/api/v1/") &&
          request.key === "synthetic-test-key",
      ),
    ).toBe(true);
    expect(requests[0].body).toContain("listMessages");
    expect(requests[1].body).toContain("sendMessage");
  });
});
