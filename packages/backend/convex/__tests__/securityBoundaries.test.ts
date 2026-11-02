import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import { hasInternalAuthorization } from "../lib/internalAuth";
import { logger } from "../lib/logger";
import { readBoundedBody, verifyUploadToken } from "../lib/ownedUploads";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import {
  assertPublicHttpUrl,
  fetchPublicUrl,
  isPublicAddress,
} from "../lib/urlGuard";
import schema from "../schema";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("internal service and upload credentials", () => {
  it("denies public image writes and anonymous paid TTS, while preserving authenticated bounded TTS", async () => {
    vi.stubEnv(
      "INTERNAL_API_SECRET",
      "test-service-secret-with-at-least-32-characters",
    );
    vi.stubEnv("DEEPGRAM_API_KEY", "test-deepgram-key");
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert("users", createTestUserData({ clerkId: "speaker" })),
    );
    const outbound = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response("audio", { headers: { "Content-Type": "audio/mpeg" } }),
      );
    vi.stubGlobal("fetch", outbound);
    expect(
      (
        await t.fetch("/store-code-execution-image", {
          method: "POST",
          headers: { "X-Convex-Internal": "true", "Content-Type": "image/png" },
          body: "image",
        })
      ).status,
    ).toBe(401);
    expect((await t.fetch("/tts?text=hello")).status).toBe(401);
    expect(outbound).not.toHaveBeenCalled();
    const client = t.withIdentity(createMockIdentity({ subject: "speaker" }));
    expect((await client.fetch(`/tts?text=${"x".repeat(2001)}`)).status).toBe(
      400,
    );
    expect((await client.fetch("/tts?text=hello&speed=NaN")).status).toBe(400);
    expect(outbound).not.toHaveBeenCalled();
    const response = await client.fetch("/tts?text=hello");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("audio");
    expect(outbound).toHaveBeenCalledTimes(1);
  });

  it("fails closed without a configured secret and rejects forged boolean headers", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "");
    expect(
      await hasInternalAuthorization(
        new Headers({ "X-Convex-Internal": "true" }),
      ),
    ).toBe(false);
    vi.stubEnv(
      "INTERNAL_API_SECRET",
      "test-service-secret-with-at-least-32-characters",
    );
    expect(
      await hasInternalAuthorization(
        new Headers({
          Authorization: "Bearer true",
          "X-Internal-Call": "true",
        }),
      ),
    ).toBe(false);
    expect(
      await hasInternalAuthorization(
        new Headers({
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
        }),
      ),
    ).toBe(true);
  });

  it("records upload ownership before returning an ID and rejects tampered and expired receipts", async () => {
    vi.stubEnv(
      "INTERNAL_API_SECRET",
      "test-service-secret-with-at-least-32-characters",
    );
    vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert("users", createTestUserData({ clerkId: "uploader" })),
    );
    const client = t.withIdentity(createMockIdentity({ subject: "uploader" }));
    const url = await client.mutation(api.files.generateUploadUrl, {});
    const token = new URL(url).searchParams.get("token")!;
    expect(await verifyUploadToken(token)).toBeTruthy();
    expect(
      await verifyUploadToken(`other:${token.split(":").slice(1).join(":")}`),
    ).toBeNull();
    const response = await t.fetch(
      `/owned-file-upload?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: "image",
      },
    );
    expect(response.status).toBe(200);
    const { storageId } = await response.json();
    expect(
      await client.mutation(api.files.saveFile, {
        storageId,
        name: "uploaded.png",
        mimeType: "image/png",
        size: 5,
      }),
    ).toBeTruthy();
    const outsider = t.withIdentity(
      createMockIdentity({ subject: "outsider" }),
    );
    await expect(
      outsider.mutation(api.files.saveFile, {
        storageId,
        name: "stolen.png",
        mimeType: "image/png",
        size: 5,
      }),
    ).rejects.toThrow(/unauthorized/);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60_000);
    expect(await verifyUploadToken(token)).toBeNull();
  });

  it("bounds streaming bodies even without content length", async () => {
    await expect(
      readBoundedBody(
        new Request("https://example.test", { method: "POST", body: "123456" }),
        5,
      ),
    ).rejects.toThrow(/too large/);
  });
});

describe("outbound URL guard", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("blocks %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
  it("rejects mixed DNS records, credentials, non-http and redirects to private IPs before fetching", async () => {
    const lookup = vi.fn().mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "10.1.2.3", family: 4 },
    ]);
    await expect(
      assertPublicHttpUrl("https://example.com", { lookup }),
    ).rejects.toThrow(/non-public/);
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(
      assertPublicHttpUrl("https://user:pass@example.com"),
    ).rejects.toThrow();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    );
    await expect(
      fetchPublicUrl("https://8.8.8.8", {}, { fetchImpl }),
    ).rejects.toThrow(/non-public/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("allows public IPv4/IPv6 and a validated HTTPS fetch", async () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
    const fetchImpl = vi.fn().mockResolvedValue(new Response("ok"));
    expect(
      await (await fetchPublicUrl("https://8.8.8.8", {}, { fetchImpl })).text(),
    ).toBe("ok");
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
  });

  it("does not forward provider credentials across redirect origins", async () => {
    const authorizations: Array<string | null> = [];
    const fetchImpl = vi.fn().mockImplementation(async (_url, init) => {
      authorizations.push(new Headers(init.headers).get("Authorization"));
      return authorizations.length === 1
        ? new Response(null, {
            status: 302,
            headers: { location: "https://1.1.1.1" },
          })
        : new Response("ok");
    });
    await fetchPublicUrl(
      "https://8.8.8.8",
      { headers: { Authorization: "Bearer provider-secret" } },
      { fetchImpl },
    );
    expect(authorizations).toEqual(["Bearer provider-secret", null]);
  });
});

it("redacts nested credentials without changing the caller's context", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  const context = {
    nested: {
      apiKey: "private-key",
      password: "private-password",
      headers: { authorization: "private-auth" },
    },
    detail: "Bearer private-bearer",
  };
  logger.info("diagnostic", context);
  expect(spy.mock.calls[0][0]).not.toMatch(
    /private-key|private-password|private-auth|private-bearer/,
  );
  expect(context.nested.apiKey).toBe("private-key");
});
