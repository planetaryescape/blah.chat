import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function fixture() {
  const t = convexTest(schema);
  const data = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const collaborator = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "collaborator", isAdmin: true }),
    );
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner, { isCollaborative: true }),
    );
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: collaborator,
      role: "collaborator",
      joinedAt: Date.now(),
    });
    const model = Object.values(MODEL_CONFIG).find((m) =>
      m.capabilities.includes("image-generation"),
    )!.id;
    const messageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, owner, {
        role: "assistant",
        status: "complete",
        model,
        generationStartedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const storageId = await ctx.storage.store(new Blob(["audio"]));
    const fileId = await ctx.db.insert("files", {
      userId: owner,
      storageId,
      name: "audio.webm",
      mimeType: "audio/webm",
      size: 5,
      createdAt: Date.now(),
    });
    return {
      owner,
      collaborator,
      conversationId,
      messageId,
      model,
      storageId,
      fileId,
    };
  });
  return {
    t,
    ...data,
    client: t.withIdentity(createMockIdentity({ subject: "owner" })),
  };
}

describe("round-two API boundaries", () => {
  it("deletes owned routing feedback while preserving foreign records and shared blobs", async () => {
    const {
      t,
      client,
      owner,
      collaborator,
      conversationId,
      messageId,
      model,
      storageId,
    } = await fixture();
    const foreign = await t.run(async (ctx) => {
      const owned = await ctx.db.insert("routingFeedback", {
        userId: owner,
        conversationId,
        messageId,
        routeLabel: "test",
        selectedModelId: model,
        signal: "completed",
        createdAt: Date.now(),
      });
      const kept = await ctx.db.insert("routingFeedback", {
        userId: collaborator,
        conversationId,
        messageId,
        routeLabel: "test",
        selectedModelId: model,
        signal: "completed",
        createdAt: Date.now(),
      });
      await ctx.db.insert("files", {
        userId: collaborator,
        storageId,
        name: "shared.webm",
        mimeType: "audio/webm",
        size: 5,
        createdAt: Date.now(),
      });
      return { owned, kept };
    });
    await client.mutation(api.users.deleteMyData, {
      confirmationText: "DELETE MY DATA",
    });
    expect(await t.run((ctx) => ctx.db.get(foreign.owned))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(foreign.kept))).not.toBeNull();
    expect(
      await t.run(async (ctx) => Boolean(await ctx.storage.get(storageId))),
    ).toBe(true);
  });
  it("allows ordinary-user hybrid search without an admin-only feature lookup", async () => {
    const { client } = await fixture();
    expect(
      await client.action(api.search.hybridSearch, { query: "missing" }),
    ).toEqual([]);
  });
  it("normalizes malformed job/upload IDs and rejects non-audio records before scheduling", async () => {
    vi.useFakeTimers();
    const { t, client, owner, conversationId, messageId, fileId, storageId } =
      await fixture();
    expect(
      await client.query(api.jobs.crud.getById, { id: "invalid" }),
    ).toBeNull();
    await expect(
      client.mutation(api.jobs.crud.createTranscription, {
        storageId: "invalid",
      }),
    ).rejects.toThrow(/not found/);
    await t.run((ctx) => ctx.db.patch(fileId, { mimeType: "image/png" }));
    await expect(
      client.mutation(api.jobs.crud.createTranscription, { storageId }),
    ).rejects.toThrow(/not found/);
    await t.run(async (ctx) => {
      await ctx.db.delete(fileId);
      await ctx.db.insert("attachments", {
        userId: owner,
        conversationId,
        messageId,
        storageId,
        type: "file",
        name: "not-audio",
        mimeType: "audio/webm",
        size: 5,
        createdAt: Date.now(),
      });
    });
    await expect(
      client.mutation(api.jobs.crud.createTranscription, { storageId }),
    ).rejects.toThrow(/not found/);
    expect(await t.run((ctx) => ctx.db.query("jobs").collect())).toEqual([]);
  });
  it.each([
    "whisper-1",
    "whisper-large-v3",
  ] as const)("preserves %s and uses provider duration rather than encoded bytes", async (model) => {
    vi.useFakeTimers();
    const { t, client, owner, storageId } = await fixture();
    await client.mutation(api.jobs.crud.createTranscription, {
      storageId,
      model,
    });
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(jobs[0].args[0]).toMatchObject({ model });
    vi.useRealTimers();
    const provider = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ text: "test transcript", duration: 120 }),
        ),
      );
    vi.stubGlobal("fetch", provider);
    expect(
      await t.action(internal.transcription.transcribeAudioInternal, {
        userId: owner,
        storageId,
        mimeType: "audio/webm",
        model,
      }),
    ).toBe("test transcript");
    expect(provider.mock.calls[0][0]).toContain(
      model === "whisper-1" ? "api.openai.com" : "api.groq.com",
    );
    expect(provider.mock.calls[0][1].body.get("response_format")).toBe(
      "verbose_json",
    );
    expect(provider.mock.calls[0][1].body.get("model")).toBe(model);
    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0].cost).toBeCloseTo(2 * 0.0067);
  });
  it("admits collaborators with a fresh timestamp and bills image completion once to the initiator", async () => {
    vi.useFakeTimers();
    const { t, collaborator, conversationId, messageId, model } =
      await fixture();
    await t
      .withIdentity(createMockIdentity({ subject: "collaborator" }))
      .mutation(api.imageGeneration.generate, {
        conversationId,
        messageId,
        model,
        prompt: "draw",
      });
    const message = await t.run((ctx) => ctx.db.get(messageId));
    expect(message?.generationStartedAt).toBe(Date.now());
    expect(message?.updatedAt).toBe(Date.now());
    await t.mutation(internal.messages.recovery.recoverStuckMessages, {});
    expect((await t.run((ctx) => ctx.db.get(messageId)))?.status).toBe(
      "pending",
    );
    expect(
      await t.mutation(internal.messages.recovery.recoverMessage, {
        messageId,
      }),
    ).toMatchObject({ recovered: false });
    const queued = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(queued[0].args[0]).toMatchObject({ userId: collaborator });
    await t.mutation(internal.messages.completeMessage, {
      messageId,
      content: "",
      inputTokens: 1,
      outputTokens: 1,
      cost: 0.25,
      usageType: "image",
      billingUserId: collaborator,
    });
    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    const usage = scheduled.filter(
      (job) =>
        job.name.includes("recordImageGeneration") ||
        job.name.includes("recordTextGeneration"),
    );
    expect(usage).toHaveLength(1);
    expect(usage[0].name).toContain("recordImageGeneration");
    expect(usage[0].args[0]).toMatchObject({
      userId: collaborator,
      cost: 0.25,
    });
  });
});
