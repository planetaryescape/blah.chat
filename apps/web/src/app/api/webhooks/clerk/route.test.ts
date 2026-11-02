/** @vitest-environment node */
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
}));
vi.mock("@/lib/logger", () => ({ default: { info: vi.fn(), error: vi.fn() } }));

import { POST } from "./route";

const webhookSecret = `whsec_${Buffer.from("test-only-signing-material-32bytes").toString("base64")}`;
const internalSecret = "test-only-internal-service-secret-32bytes";
const body =
  '{ "type": "user.created", "data": { "id": "clerk-test-user", "email_addresses": [{"id":"email-1","email_address":"synthetic@example.com"}], "primary_email_address_id": "email-1", "first_name":"Synthetic", "last_name":"User", "image_url":"https://example.com/avatar.png" } }';

function signedRequest() {
  const timestamp = new Date();
  const id = "msg_synthetic";
  requestHeaders.current = new Headers({
    "svix-id": id,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": new Webhook(webhookSecret).sign(id, timestamp, body),
  });
  return new Request("https://example.com/api/webhooks/clerk", {
    method: "POST",
    body,
  });
}

beforeEach(() => {
  vi.stubEnv("CLERK_WEBHOOK_SECRET", webhookSecret);
  vi.stubEnv("INTERNAL_API_SECRET", internalSecret);
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Clerk webhook boundary", () => {
  it("verifies the original signed bytes and authenticates the Convex write", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          value: "synthetic-convex-id",
          logLines: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await POST(signedRequest());
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalled();
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload.path).toBe("users:createUser");
    expect(payload.args[0]).toMatchObject({
      internalSecret,
      clerkId: "clerk-test-user",
    });
  });

  it("rejects an invalid signature without writing account data", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const request = signedRequest();
    requestHeaders.current.set("svix-signature", "v1,invalid");
    expect((await POST(request)).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed without configured internal authentication", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(signedRequest());
    expect(response.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(internalSecret);
  });
});
