import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inferUploadName, uploadAssetToSignedUrl } from "./uploads";

const originalFetch = globalThis.fetch;

describe("inferUploadName", () => {
  it("extracts filename from URI path", () => {
    expect(inferUploadName("file:///tmp/photo.png", "image/png")).toBe(
      "photo.png",
    );
  });

  it("decodes URL-encoded characters in filename", () => {
    expect(inferUploadName("file:///tmp/my%20photo.png", "image/png")).toBe(
      "my photo.png",
    );
  });

  it("generates fallback name from mimeType when URI has no filename", () => {
    const name = inferUploadName("file:///tmp/", "audio/m4a");
    expect(name).toMatch(/^attachment-\d+\.m4a$/);
  });

  it("uses 'bin' extension when mimeType has no subtype", () => {
    const name = inferUploadName("file:///tmp/", "application");
    expect(name).toMatch(/^attachment-\d+\.bin$/);
  });
});

describe("uploadAssetToSignedUrl", () => {
  let fetchCalls: Array<{ url: string; init?: RequestInit }>;

  beforeEach(() => {
    fetchCalls = [];
    globalThis.fetch = vi.fn(
      async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        fetchCalls.push({ url, init });

        if (url === "file:///tmp/photo.png") {
          return new Response(new Blob(["png-bytes"], { type: "image/png" }), {
            status: 200,
          });
        }

        if (url === "https://r2.example/upload/photo.png") {
          return new Response(null, { status: 200 });
        }

        throw new Error(`Unexpected fetch ${url}`);
      },
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches local file, requests signed URL, then uploads via PUT", async () => {
    const createFileUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: "https://r2.example/upload/photo.png",
      storageId: "users/u1/conversations/c1/photo.png",
      method: "PUT",
    });

    const result = await uploadAssetToSignedUrl(
      { createFileUploadUrl } as any,
      { uri: "file:///tmp/photo.png", name: "photo.png" },
      "conv_mobile",
    );

    // Verify the upload result contains correct metadata
    expect(result).toEqual({
      name: "photo.png",
      mimeType: "image/png",
      size: 9, // "png-bytes" = 9 bytes
      storageId: "users/u1/conversations/c1/photo.png",
    });

    // Verify createFileUploadUrl was called with correct args
    expect(createFileUploadUrl).toHaveBeenCalledWith({
      conversationId: "conv_mobile",
      fileName: "photo.png",
      contentType: "image/png",
    });

    // Verify the PUT upload used correct headers
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[1]!.url).toBe("https://r2.example/upload/photo.png");
    expect(fetchCalls[1]!.init?.method).toBe("PUT");
    expect(fetchCalls[1]!.init?.headers).toEqual({
      "Content-Type": "image/png",
    });
  });

  it("throws when the upload PUT returns a non-OK status", async () => {
    globalThis.fetch = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url === "file:///tmp/photo.png") {
        return new Response(new Blob(["bytes"]), { status: 200 });
      }
      return new Response(null, { status: 403 });
    }) as typeof fetch;

    await expect(
      uploadAssetToSignedUrl(
        {
          createFileUploadUrl: vi.fn().mockResolvedValue({
            uploadUrl: "https://r2.example/upload/photo.png",
            storageId: "s1",
            method: "PUT",
          }),
        } as any,
        { uri: "file:///tmp/photo.png", name: "photo.png" },
      ),
    ).rejects.toThrow("Failed to upload file");
  });

  it("falls back to MIME type from blob when not provided", async () => {
    const createFileUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: "https://r2.example/upload/photo.png",
      storageId: "s1",
      method: "PUT",
    });

    const result = await uploadAssetToSignedUrl(
      { createFileUploadUrl } as any,
      { uri: "file:///tmp/photo.png" }, // no name or mimeType
    );

    expect(result.mimeType).toBe("image/png");
    expect(result.name).toBe("photo.png"); // inferred from URI
  });
});
