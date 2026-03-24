import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { inferUploadName, uploadAssetToSignedUrl } from "./uploads";

const originalFetch = globalThis.fetch;

describe("uploadAssetToSignedUrl", () => {
  beforeEach(() => {
    globalThis.fetch = mock(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "file:///tmp/photo.png") {
        return new Response(new Blob(["png-bytes"], { type: "image/png" }), {
          status: 200,
        });
      }

      if (url === "https://r2.example/upload/photo.png") {
        expect(init).toMatchObject({
          method: "PUT",
          headers: { "Content-Type": "image/png" },
        });
        return new Response(null, { status: 200 });
      }

      throw new Error(`Unexpected fetch ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uploads through the signed PUT url returned by the API client", async () => {
    const createFileUploadUrl = mock(
      async ({
        conversationId,
        fileName,
        contentType,
      }: {
        conversationId?: string;
        fileName: string;
        contentType: string;
      }) => {
        expect(conversationId).toBe("conv_mobile");
        expect(fileName).toBe("photo.png");
        expect(contentType).toBe("image/png");
        return {
          uploadUrl: "https://r2.example/upload/photo.png",
          storageId: "users/u1/conversations/c1/photo.png",
          method: "PUT",
        };
      },
    );

    const uploaded = await uploadAssetToSignedUrl(
      {
        createFileUploadUrl,
      } as unknown as {
        createFileUploadUrl: typeof createFileUploadUrl;
      },
      {
        uri: "file:///tmp/photo.png",
        name: "photo.png",
      },
      "conv_mobile",
    );

    expect(uploaded).toEqual({
      name: "photo.png",
      mimeType: "image/png",
      size: 9,
      storageId: "users/u1/conversations/c1/photo.png",
    });
    expect(createFileUploadUrl).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to a generated name when the uri has no file name", () => {
    const name = inferUploadName("file:///tmp/", "audio/m4a");
    expect(name.endsWith(".m4a")).toBe(true);
    expect(name.startsWith("attachment-")).toBe(true);
  });
});
