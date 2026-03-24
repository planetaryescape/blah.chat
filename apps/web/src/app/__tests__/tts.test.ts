/**
 * @vitest-environment node
 */
import { createTtsCacheRepository } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../packages/persistence-postgres/src/testing/pglite";

const { createSignedReadUrlMock, uploadObjectMock, r2Client } = vi.hoisted(
  () => ({
    createSignedReadUrlMock: vi.fn(),
    uploadObjectMock: vi.fn(),
    r2Client: { send: vi.fn() },
  }),
);
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createSignedReadUrl: createSignedReadUrlMock,
    uploadObject: uploadObjectMock,
  };
});

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-test",
    },
  }),
  getPersistenceR2Client: () => r2Client,
}));

async function hashRequest(text: string, voice: string, speed: number) {
  const data = new TextEncoder().encode(`${text}:${voice}:${speed}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

describe("/tts", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    db = await createTestPersistenceDb();
    process.env.DEEPGRAM_API_KEY = "deepgram_test_key";
  });

  it("synthesizes audio on cache miss, stores it in R2, and persists cache metadata", async () => {
    const deepgramFetch = vi.fn(async () => {
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    });
    vi.stubGlobal("fetch", deepgramFetch);

    const { GET } = await import("../tts/route");
    const response = await GET(
      createMockRequest("/tts?text=hello%20world&voice=aura-luna-en&speed=1.5"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
      1, 2, 3, 4,
    ]);

    expect(uploadObjectMock).toHaveBeenCalledWith({
      client: r2Client,
      bucket: "blah-chat-test",
      key: expect.stringMatching(/^cache\/tts\/.+\.mp3$/),
      body: expect.any(Uint8Array),
      contentType: "audio/mpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });

    const hash = await hashRequest("hello world", "aura-luna-en", 1.5);
    const cached = await createTtsCacheRepository(db).getByHash(hash);

    expect(cached).toMatchObject({
      hash,
      bucket: "blah-chat-test",
      key: expect.stringMatching(/^cache\/tts\/.+\.mp3$/),
      text: "hello world",
      voice: "aura-luna-en",
      speed: 1.5,
      format: "mp3",
    });
    expect(createSignedReadUrlMock).not.toHaveBeenCalled();
    expect(deepgramFetch).toHaveBeenCalledTimes(1);
  });

  it("redirects to a signed R2 url on cache hit", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const hash = await hashRequest("cached hello", "aura-asteria-en", 1);
    await createTtsCacheRepository(db).upsert({
      hash,
      bucket: "blah-chat-test",
      key: "cache/tts/cached.mp3",
      text: "cached hello",
      voice: "aura-asteria-en",
      speed: 1,
      format: "mp3",
    });
    createSignedReadUrlMock.mockResolvedValueOnce(
      "https://r2.example/cache/tts/cached.mp3",
    );

    const { GET } = await import("../tts/route");
    const response = await GET(createMockRequest("/tts?text=cached%20hello"));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://r2.example/cache/tts/cached.mp3",
    );
    expect(createSignedReadUrlMock).toHaveBeenCalledWith({
      client: r2Client,
      bucket: "blah-chat-test",
      key: "cache/tts/cached.mp3",
    });
    expect(uploadObjectMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
