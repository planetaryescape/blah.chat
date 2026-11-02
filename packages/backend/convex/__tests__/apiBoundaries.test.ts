import { makeFunctionReference } from "convex/server";
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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function fixture() {
  const t = convexTest(schema);
  const data = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    );
    const foreign = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "foreign" }),
    );
    const storageId = await ctx.storage.store(new Blob(["audio"]));
    await ctx.db.insert("files", {
      userId: owner,
      storageId,
      name: "audio.webm",
      mimeType: "audio/webm",
      size: 5,
      createdAt: Date.now(),
    });
    return { owner, foreign, storageId };
  });
  return {
    t,
    ...data,
    client: t.withIdentity(createMockIdentity({ subject: "owner" })),
  };
}

describe("API transcription boundary", () => {
  it("uses actual Convex identity and rejects anonymous, foreign and unregistered storage", async () => {
    vi.useFakeTimers();
    const { t, client, storageId, owner } = await fixture();
    await expect(
      t.mutation(api.jobs.crud.createTranscription, { storageId }),
    ).rejects.toThrow(/authenticated/);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "foreign" }))
        .mutation(api.jobs.crud.createTranscription, { storageId }),
    ).rejects.toThrow(/not found/);
    const unknown = await t.run((ctx) =>
      ctx.storage.store(new Blob(["unknown"])),
    );
    await expect(
      client.mutation(api.jobs.crud.createTranscription, {
        storageId: unknown,
      }),
    ).rejects.toThrow(/not found/);
    const jobId = await client.mutation(api.jobs.crud.createTranscription, {
      storageId,
    });
    expect(
      (await client.query(api.jobs.crud.getById, { id: jobId }))?.userId,
    ).toBe(owner);
    expect(
      await t
        .withIdentity(createMockIdentity({ subject: "foreign" }))
        .query(api.jobs.crud.getById, { id: jobId }),
    ).toBeNull();
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(1);
  });

  it("counts failed requests atomically and cannot exceed 30 jobs under concurrent requests", async () => {
    vi.useFakeTimers();
    const { t, client, storageId, owner } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 29; i++)
        await ctx.db.insert("jobs", {
          userId: owner,
          type: "transcribe",
          status: "failed",
          input: {},
          createdAt: Date.now(),
          expiresAt: Date.now() + 86400000,
          retryCount: 0,
        });
    });
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        client.mutation(api.jobs.crud.createTranscription, { storageId }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await t.run((ctx) => ctx.db.query("jobs").collect())).toHaveLength(
      30,
    );
  });

  it("rejects oversized blobs before scheduling", async () => {
    vi.useFakeTimers();
    const { t, client, owner, storageId } = await fixture();
    const large = await t.run(async (ctx) => {
      const id = await ctx.storage.store(
        new Blob([new Uint8Array(24 * 1024 * 1024 + 1)]),
      );
      await ctx.db.insert("files", {
        userId: owner,
        storageId: id,
        name: "large",
        mimeType: "audio/webm",
        size: 1,
        createdAt: Date.now(),
      });
      return id;
    });
    await expect(
      client.mutation(api.jobs.crud.createTranscription, { storageId: large }),
    ).rejects.toThrow(/too large/);
    expect(await t.run((ctx) => ctx.db.query("jobs").collect())).toHaveLength(
      0,
    );
    expect(storageId).toBeTruthy();
  });

  it("checks ownership again at execution and records provider usage with a faithful fake", async () => {
    const { t, storageId, owner, foreign } = await fixture();
    const provider = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "synthetic transcript" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", provider);
    await expect(
      t.action(internal.transcription.transcribeAudioInternal, {
        userId: foreign,
        storageId,
        mimeType: "audio/webm",
      }),
    ).rejects.toThrow(/not found/);
    expect(provider).not.toHaveBeenCalled();
    expect(
      await t.action(internal.transcription.transcribeAudioInternal, {
        userId: owner,
        storageId,
        mimeType: "audio/webm",
      }),
    ).toBe("synthetic transcript");
    expect(provider).toHaveBeenCalledTimes(1);
    const usage = await t.run((ctx) => ctx.db.query("usageRecords").collect());
    expect(usage).toHaveLength(1);
    expect(usage[0].userId).toBe(owner);
    expect(usage[0].cost).toBeGreaterThan(0);
  });
});

describe("Clerk lifecycle", () => {
  it("fails closed without the configured webhook secret, upserts authoritative fields, and deletes idempotently", async () => {
    const { t, owner, foreign } = await fixture();
    await expect(
      t.mutation(api.users.deleteUser, { clerkId: "owner" }),
    ).rejects.toThrow(/Unauthorized/);
    const secret = "synthetic-webhook-test-secret-32-characters";
    vi.stubEnv("INTERNAL_API_SECRET", secret);
    await t.mutation(api.users.createUser, {
      internalSecret: secret,
      clerkId: "owner",
      email: "new@example.test",
      name: "Authoritative",
    });
    expect((await t.run((ctx) => ctx.db.get(owner)))?.name).toBe(
      "Authoritative",
    );
    const conversation = await t.run(async (ctx) => {
      await ctx.db.insert("jobs", {
        userId: owner,
        type: "transcribe",
        status: "pending",
        input: {},
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        retryCount: 0,
      });
      const foreignConversation = await ctx.db.insert(
        "conversations",
        createTestConversationData(foreign),
      );
      const connectionId = await ctx.db.insert("composioConnections", {
        userId: owner,
        composioConnectionId: "synthetic-owned-integration",
        integrationId: "github",
        integrationName: "GitHub",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("conversationIntegrations", {
        userId: owner,
        conversationId: foreignConversation,
        connectionId,
      });
      return foreignConversation;
    });
    await t.mutation(api.users.deleteUser, {
      internalSecret: secret,
      clerkId: "owner",
    });
    expect(await t.run((ctx) => ctx.db.get(owner))).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("jobs").collect())).toEqual([]);
    expect(
      await t.run((ctx) => ctx.db.query("conversationIntegrations").collect()),
    ).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(conversation))).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get(foreign))).not.toBeNull();
    expect(
      await t.mutation(api.users.deleteUser, {
        internalSecret: secret,
        clerkId: "owner",
      }),
    ).toBeNull();
  });

  it("public image wrapper rejects foreign messages before any scheduling", async () => {
    const { t, owner, foreign } = await fixture();
    const ids = await t.run(async (ctx) => {
      const conversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(owner),
      );
      const messageId = await ctx.db.insert(
        "messages",
        createTestMessageData(conversationId, owner, {
          role: "assistant",
          status: "complete",
        }),
      );
      const foreignConversationId = await ctx.db.insert(
        "conversations",
        createTestConversationData(foreign),
      );
      return { conversationId, messageId, foreignConversationId };
    });
    const ref = makeFunctionReference<"mutation">("imageGeneration:generate");
    const input = {
      conversationId: ids.conversationId,
      messageId: ids.messageId,
      model: "not-a-model",
      prompt: "draw",
    };
    await expect(t.mutation(ref, input)).rejects.toThrow(/authenticated/);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "foreign" }))
        .mutation(ref, input),
    ).rejects.toThrow(/not found/);
    await expect(
      t
        .withIdentity(createMockIdentity({ subject: "owner" }))
        .mutation(ref, { ...input, conversationId: ids.foreignConversationId }),
    ).rejects.toThrow(/not found/);
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });
});
