import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { internal } from "../_generated/api";
import { chunkFile, extractFileText } from "../files/chunking";
import { searchFileChunks } from "../files/search";
import { createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const { embedMock } = vi.hoisted(() => ({ embedMock: vi.fn() }));

// Keep Convex actions and the real schema; replace only the network-backed SDK call.
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, embed: embedMock };
});

afterEach(() => vi.clearAllMocks());

async function createFileFixture() {
  const t = convexTest(schema);
  const fixture = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "file-owner" }),
    );
    const foreignId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "file-foreign" }),
    );
    const projectId = await ctx.db.insert("projects", {
      userId: ownerId,
      name: "Owner project",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const foreignProjectId = await ctx.db.insert("projects", {
      userId: foreignId,
      name: "Foreign project",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const storageId = await ctx.storage.store(new Blob(["private file text"]));
    const foreignStorageId = await ctx.storage.store(
      new Blob(["foreign private text"]),
    );
    const fileId = await ctx.db.insert("files", {
      userId: ownerId,
      storageId,
      name: "private.txt",
      mimeType: "text/plain",
      size: 17,
      createdAt: Date.now(),
    });
    const foreignFileId = await ctx.db.insert("files", {
      userId: foreignId,
      storageId: foreignStorageId,
      name: "foreign.txt",
      mimeType: "text/plain",
      size: 19,
      createdAt: Date.now(),
    });
    const projectFileId = await ctx.db.insert("projectFiles", {
      projectId,
      fileId,
      userId: ownerId,
      addedAt: Date.now(),
    });
    await ctx.db.insert("fileChunks", {
      fileId,
      userId: ownerId,
      projectId,
      chunkIndex: 0,
      content: "private searchable content",
      charOffset: 0,
      tokenCount: 4,
      embedding: [1, ...Array(1535).fill(0)],
      createdAt: Date.now(),
    });
    await ctx.db.insert("fileChunks", {
      fileId: foreignFileId,
      userId: ownerId,
      projectId,
      chunkIndex: 0,
      content: "must not leak foreign parent content",
      charOffset: 0,
      tokenCount: 7,
      embedding: [1, ...Array(1535).fill(0)],
      createdAt: Date.now(),
    });
    return {
      ownerId,
      foreignId,
      projectId,
      foreignProjectId,
      fileId,
      projectFileId,
    };
  });
  return { t, ...fixture };
}

describe("file RAG authorization", () => {
  it("exports arbitrary-file chunking, extraction, and search only as internal actions", () => {
    expect(chunkFile.isInternal).toBe(true);
    expect(extractFileText.isInternal).toBe(true);
    expect(searchFileChunks.isInternal).toBe(true);
  });

  it("preserves storage extraction and chunking for the internal ingestion pipeline", async () => {
    const { t, fileId } = await createFileFixture();

    await expect(
      t.action(internal.files.extraction.extractText, { fileId }),
    ).resolves.toBe("private file text");
    await expect(
      t.action(internal.files.chunking.chunkFile, {
        fileId,
        content: "private file text",
      }),
    ).resolves.toMatchObject([{ content: "private file text", chunkIndex: 0 }]);
  });

  it("rejects foreign projects before embedding and retrieves an owner's project file", async () => {
    const { t, ownerId, foreignId, projectId, foreignProjectId } =
      await createFileFixture();
    embedMock.mockResolvedValue({ embedding: [1, ...Array(1535).fill(0)] });

    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "private",
        projectId: foreignProjectId,
        userId: ownerId,
      }),
    ).rejects.toThrow(/unauthorized project/i);
    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "private",
        projectId,
        userId: foreignId,
      }),
    ).rejects.toThrow(/unauthorized project/i);
    expect(embedMock).not.toHaveBeenCalled();

    const results = await t.action(internal.files.search.searchFileChunks, {
      query: "private",
      projectId,
      userId: ownerId,
      topK: 1,
    });
    expect(embedMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      chunk: { content: "private searchable content", userId: ownerId },
      file: { name: "private.txt", userId: ownerId },
    });

    const unscopedResults = await t.action(
      internal.files.search.searchFileChunks,
      { query: "private", userId: ownerId, topK: 2 },
    );
    expect(unscopedResults).toHaveLength(1);
    expect(unscopedResults[0].file?.name).toBe("private.txt");
    expect(unscopedResults.map((result) => result.chunk.content)).not.toContain(
      "must not leak foreign parent content",
    );
  });

  it("rejects invalid query and topK values before embedding", async () => {
    const { t, ownerId } = await createFileFixture();
    embedMock.mockResolvedValue({ embedding: [1, ...Array(1535).fill(0)] });

    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "  ",
        userId: ownerId,
      }),
    ).rejects.toThrow(/query/i);
    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "valid",
        userId: ownerId,
        topK: 1.5,
      }),
    ).rejects.toThrow(/topK/i);
    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "valid",
        userId: ownerId,
        topK: 129,
      }),
    ).rejects.toThrow(/topK/i);
    expect(embedMock).not.toHaveBeenCalled();
  });

  it("does not return project results after the project-file grant is revoked during search", async () => {
    const { t, ownerId, projectId, projectFileId } = await createFileFixture();
    embedMock.mockImplementation(async () => {
      await t.run((ctx) => ctx.db.delete(projectFileId));
      return { embedding: [1, ...Array(1535).fill(0)] };
    });

    await expect(
      t.action(internal.files.search.searchFileChunks, {
        query: "private",
        projectId,
        userId: ownerId,
      }),
    ).resolves.toEqual([]);
  });
});
