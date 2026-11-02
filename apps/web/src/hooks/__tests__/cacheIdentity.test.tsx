import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { act, render, screen, waitFor } from "@testing-library/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/cache/context");

const state = vi.hoisted(() => ({
  loaded: true,
  userId: "A" as string | null,
  authenticated: true,
  user: { clerkId: "A" } as { clerkId: string } | null | undefined,
  databases: new Map<string, Map<string, Map<string, unknown>>>(),
  metadata: { attachments: [], toolCalls: [], sources: [] },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: state.loaded, userId: state.userId }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: state.authenticated,
  }),
  useQuery: (query: FunctionReference<"query">) =>
    getFunctionName(query) === "messages:batchGetMetadata"
      ? state.metadata
      : state.user,
}));
// This fixture checks hook request-scope wiring with an already-present tree;
// the independent message-presence subscription is covered by the cache tests.
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => undefined }));
vi.mock("convex-helpers/react/cache", () => ({
  ConvexQueryCacheProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock("@/hooks/useAccessibilitySettings", () => ({
  useAccessibilitySettings: () => {},
}));
vi.mock("@/lib/cache/cleanup", () => ({ cleanupOldData: async () => {} }));
// Persistent backing maps model IndexedDB across database handles/remounts.
vi.mock("dexie", () => ({
  default: class {
    constructor(public name: string) {
      if (!state.databases.has(name)) state.databases.set(name, new Map());
    }
    async transaction(_mode: string, _table: unknown, fn: () => Promise<void>) {
      await fn();
    }
    version() {
      return {
        stores: (schema: Record<string, string>) => {
          const tables = state.databases.get(this.name)!;
          for (const table of Object.keys(schema)) {
            if (!tables.has(table)) tables.set(table, new Map());
            const records = tables.get(table)!;
            Object.assign(this, {
              [table]: {
                put: async (row: { _id: string }) => records.set(row._id, row),
                bulkPut: async (rows: { _id: string }[]) => {
                  for (const row of rows) records.set(row._id, row);
                },
                bulkGet: async (ids: string[]) =>
                  ids.map((id) => records.get(id)),
                bulkDelete: async (ids: string[]) => {
                  for (const id of ids) records.delete(id);
                },
                where: (key: string) => ({
                  equals: (value: unknown) => ({
                    toArray: async () =>
                      [...records.values()].filter(
                        (row) =>
                          (row as Record<string, unknown>)[key] === value,
                      ),
                  }),
                  anyOf: (values: unknown[]) => ({
                    toArray: async () =>
                      [...records.values()].filter(
                        // SAFETY: the map contains only synthetic object fixtures.
                        (row) =>
                          values.includes(
                            (row as Record<string, unknown>)[key],
                          ),
                      ),
                    delete: async () => {
                      for (const [id, row] of records) {
                        // SAFETY: the map contains only synthetic object fixtures.
                        if (
                          values.includes((row as Record<string, unknown>)[key])
                        )
                          records.delete(id);
                      }
                    },
                  }),
                }),
                toArray: async () => [...records.values()],
              },
            });
          }
        },
      };
    }
  },
}));

import { CacheProvider } from "@/components/providers/cache-provider";
import { UserCacheContext, useUserCache } from "@/lib/cache/context";
import { BlahChatCache, getCache, setActiveCache } from "@/lib/cache/db";
import { syncMessageMetadata, syncMessageTree } from "@/lib/cache/messageTree";
import { getSiblingsForMessage, useMetadataCacheSync } from "../useCacheSync";

function MetadataProbe({ ids }: { ids: Id<"messages">[] }) {
  useMetadataCacheSync(ids);
  return null;
}

function Probe() {
  const cache = useUserCache();
  const [content, setContent] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    cache.notes.toArray().then((notes) => {
      if (active) setContent(notes.map((note) => note.content));
    });
    return () => {
      active = false;
    };
  }, [cache]);
  return (
    <div data-testid="identity">
      {cache.name}
      {content.join(" ")}
    </div>
  );
}

describe("cache identity boundary", () => {
  it("clears an authoritative empty metadata response through the actual scoped hook", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: synthetic cache-only rows exercise the requested message-ID boundary.
    await cache.messages.bulkPut([
      { _id: "live" },
      { _id: "outside" },
    ] as never);
    // SAFETY: only metadata ownership and identity fields are used by reconciliation.
    await cache.toolCalls.bulkPut([
      { _id: "removed-partial", messageId: "live" },
      { _id: "outside-partial", messageId: "outside" },
    ] as never);
    setActiveCache(cache);
    render(
      <UserCacheContext.Provider value={cache}>
        <MetadataProbe ids={["live" as Id<"messages">]} />
      </UserCacheContext.Provider>,
    );
    await waitFor(async () => {
      expect(await cache.toolCalls.toArray()).toEqual([
        { _id: "outside-partial", messageId: "outside" },
      ]);
    });
    expect((await cache.messages.toArray()).map((row) => row._id)).toEqual([
      "live",
      "outside",
    ]);
  });

  it("reconciles each requested live message's metadata without touching unrequested messages or another owner", async () => {
    const cache = new BlahChatCache("A");
    const foreign = new BlahChatCache("B");
    // SAFETY: minimal cache fixtures exercise message IDs, not server validation.
    await cache.messages.bulkPut([
      { _id: "live", conversationId: "c" },
      { _id: "empty", conversationId: "c" },
      { _id: "outside", conversationId: "other" },
    ] as never);
    const rows = [
      { _id: "removed-partial", messageId: "live", content: "old" },
      { _id: "retained", messageId: "live", content: "old" },
      { _id: "empty-row", messageId: "empty" },
      { _id: "outside-row", messageId: "outside", content: "private outside" },
    ];
    // SAFETY: metadata fixtures intentionally omit fields unrelated to reconciliation.
    await cache.attachments.bulkPut(rows as never);
    // SAFETY: same deliberately minimal metadata fixture.
    await cache.toolCalls.bulkPut(rows as never);
    // SAFETY: same deliberately minimal metadata fixture.
    await cache.sources.bulkPut(rows as never);
    // SAFETY: identical local IDs in B must remain isolated from A's reconciliation.
    await foreign.toolCalls.bulkPut(rows as never);
    await syncMessageMetadata(
      cache,
      {
        attachments: [{ _id: "replacement", messageId: "live" }],
        toolCalls: [
          { _id: "retained", messageId: "live", content: "complete" },
          {
            _id: "outside-row",
            messageId: "outside",
            content: "unrequested response",
          },
        ],
        sources: [],
        // SAFETY: synthetic IDs stay in this owner-scoped cache fixture.
      } as never,
      () => true,
      ["live", "empty"] as never,
    );
    expect(await cache.attachments.toArray()).toEqual([
      rows[3],
      { _id: "replacement", messageId: "live" },
    ]);
    expect(await cache.toolCalls.toArray()).toEqual([
      { _id: "retained", messageId: "live", content: "complete" },
      rows[3],
    ]);
    expect(await cache.sources.toArray()).toEqual([rows[3]]);
    expect(await foreign.toolCalls.toArray()).toEqual(rows);
    expect((await cache.messages.toArray()).map((row) => row._id)).toEqual([
      "live",
      "empty",
      "outside",
    ]);
  });

  it("distinguishes unfetched data and absent scope from an authoritative empty table", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: minimal synthetic owner-scoped fixtures.
    await cache.messages.put({ _id: "live" } as never);
    // SAFETY: metadata fixture omits unrelated schema fields.
    await cache.toolCalls.put({ _id: "partial", messageId: "live" } as never);
    // SAFETY: metadata fixture omits unrelated schema fields.
    await cache.attachments.put({
      _id: "attachment",
      messageId: "live",
    } as never);
    // SAFETY: synthetic requested message ID never leaves the cache.
    const scope = ["live"] as never;
    await syncMessageMetadata(cache, undefined, () => true, scope);
    await syncMessageMetadata(cache, { toolCalls: [] });
    await syncMessageMetadata(cache, { toolCalls: [] }, () => true, []);
    expect(await cache.toolCalls.toArray()).toHaveLength(1);
    await syncMessageMetadata(cache, { toolCalls: [] }, () => true, scope);
    expect(await cache.toolCalls.toArray()).toEqual([]);
    expect(await cache.attachments.toArray()).toHaveLength(1);
    await syncMessageMetadata(
      cache,
      { attachments: [], toolCalls: [], sources: [] },
      () => true,
      scope,
    );
    expect(await cache.attachments.toArray()).toEqual([]);
  });

  it("does not delete previously cached metadata when subscription liveness changes during the reads", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: synthetic cache records omit unrelated server fields.
    await cache.messages.put({ _id: "live" } as never);
    // SAFETY: this test exercises only metadata identity and messageId indexing.
    await cache.toolCalls.put({ _id: "partial", messageId: "live" } as never);
    let active = true;
    // SAFETY: synthetic message IDs are confined to the cache fixture.
    const pending = syncMessageMetadata(
      cache,
      { toolCalls: [] },
      () => active,
      ["live"] as never,
    );
    active = false;
    await pending;
    expect(await cache.toolCalls.toArray()).toEqual([
      { _id: "partial", messageId: "live" },
    ]);
  });

  it("rejects late orphan metadata but retries metadata for messages that arrive later", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: minimal metadata fixtures only exercise cache messageId ownership.
    const metadata = {
      attachments: [{ _id: "attachment", messageId: "message" }],
      toolCalls: [{ _id: "tool", messageId: "message" }],
      sources: [{ _id: "source", messageId: "message" }],
    } as never;
    await syncMessageMetadata(cache, metadata);
    expect(await cache.attachments.toArray()).toEqual([]);
    // SAFETY: synthetic message identity, no server schema validation is needed.
    await cache.messages.put({
      _id: "message",
      conversationId: "conversation",
    } as never);
    await syncMessageMetadata(cache, metadata);
    for (const table of [cache.attachments, cache.toolCalls, cache.sources])
      expect(await table.toArray()).toHaveLength(1);
    // SAFETY: fixture conversation IDs never leave the cache.
    await syncMessageTree(cache, "conversation" as never, []);
    await syncMessageMetadata(cache, metadata);
    for (const table of [cache.attachments, cache.toolCalls, cache.sources])
      expect(await table.toArray()).toEqual([]);
  });

  it("does not write metadata for a superseded subscription callback", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: synthetic cache fixture omits unrelated fields.
    await cache.messages.put({ _id: "message" } as never);
    await syncMessageMetadata(
      cache,
      { attachments: [{ _id: "late", messageId: "message" }] } as never,
      () => false,
    );
    expect(await cache.attachments.toArray()).toEqual([]);
  });
  beforeEach(() => {
    state.databases.clear();
    state.loaded = true;
    state.userId = "A";
    state.authenticated = true;
    state.user = { clerkId: "A" };
    setActiveCache(null);
  });

  it("keeps regenerated inactive siblings and unloaded history while cascading only actual tree orphans", async () => {
    const cache = new BlahChatCache("A");
    const conversationId =
      "conversation-A" as import("@blah-chat/backend/convex/_generated/dataModel").Id<"conversations">;
    const rows = [
      { _id: "root", conversationId, createdAt: 1, isActiveBranch: true },
      {
        _id: "old-version",
        conversationId,
        createdAt: 2,
        isActiveBranch: false,
        parentMessageId: "root",
      },
      {
        _id: "new-version",
        conversationId,
        createdAt: 3,
        isActiveBranch: true,
        parentMessageId: "root",
      },
    ];
    await cache.messages.bulkPut([
      ...rows,
      { _id: "deleted", conversationId },
    ] as never);
    // SAFETY: minimal synthetic metadata exercises only its messageId index.
    const metadata = [
      { _id: "orphan", messageId: "deleted" },
      { _id: "retained", messageId: "old-version" },
      { _id: "other-conversation", messageId: "other" },
    ];
    // SAFETY: intentionally minimal metadata omits unrelated server fields.
    await Promise.all([
      cache.attachments.bulkPut(metadata as never),
      cache.toolCalls.bulkPut(metadata as never),
      cache.sources.bulkPut(metadata as never),
    ]);
    await syncMessageTree(cache, conversationId, rows as never);
    expect((await cache.messages.toArray()).map((row) => row._id)).toEqual([
      "root",
      "old-version",
      "new-version",
    ]);
    const messages = await cache.messages.toArray();
    expect(getSiblingsForMessage(messages, messages[2])).toHaveLength(2);
    for (const table of [cache.attachments, cache.toolCalls, cache.sources]) {
      expect((await table.toArray()).map((row) => row._id)).toEqual([
        "retained",
        "other-conversation",
      ]);
    }
  });

  it("writes no unchanged history and only the streamed row, even without a timestamp change", async () => {
    const cache = new BlahChatCache("A");
    // SAFETY: synthetic IDs never leave this in-memory cache test.
    const conversationId =
      "conversation-A" as import("@blah-chat/backend/convex/_generated/dataModel").Id<"conversations">;
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      _id: `message-${i}`,
      conversationId,
      content: "history",
      updatedAt: 1,
    }));
    // SAFETY: minimal message fixtures exercise comparison, not server validation.
    await cache.messages.bulkPut(rows as never);
    const writes = vi.spyOn(cache.messages, "bulkPut");
    // SAFETY: the same synthetic rows omit unrelated server fields.
    await syncMessageTree(cache, conversationId, rows as never);
    expect(writes).not.toHaveBeenCalled();
    const streamed = {
      ...rows[999],
      content: "partial response",
      isActiveBranch: true,
    };
    // SAFETY: streaming fixture changes only the cache fields under test.
    await syncMessageTree(cache, conversationId, [
      ...rows.slice(0, 999),
      streamed,
    ] as never);
    expect(writes).toHaveBeenCalledExactlyOnceWith([streamed]);
  });

  it("partitions endpoints by protocol and port, not only hostname", () => {
    const names = [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3000",
    ].map((url) => {
      vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", url);
      return new BlahChatCache("A").name;
    });
    vi.unstubAllEnvs();
    expect(new Set(names).size).toBe(3);
  });

  it("isolates every persisted table, including delayed prior-account writes", async () => {
    const a = new BlahChatCache("A");
    const b = new BlahChatCache("B");
    const tables = [
      "notes",
      "messages",
      "conversations",
      "tasks",
      "projects",
      "attachments",
      "toolCalls",
      "sources",
      "pendingMutations",
      "userPreferences",
    ] as const;
    for (const table of tables) {
      // Deliberately malformed rows: isolation must not depend on a userId field.
      await a[table].put({ _id: "private-A" } as never);
      expect(await b[table].toArray()).toEqual([]);
    }
    setActiveCache(a);
    const oldHandle = getCache();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    }).then(() => oldHandle.notes.put({ _id: "late-A" } as never));
    setActiveCache(b);
    release();
    await pending;
    expect(await getCache().notes.toArray()).toEqual([]);
    expect(await new BlahChatCache("B").notes.toArray()).toEqual([]);
    expect(await new BlahChatCache("A").notes.toArray()).toHaveLength(2);
    expect(a.name).not.toBe(b.name);
  });

  it("unmounts A before B identity query resolves and fails closed while loading", async () => {
    // SAFETY: intentionally minimal cache fixtures exercise storage isolation,
    // not the unrelated server note schema.
    await new BlahChatCache("A").notes.put({
      _id: "private",
      content: "A secret note",
    } as never);
    const view = render(
      <CacheProvider>
        <Probe />
      </CacheProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("identity").textContent).toContain(
        "A secret note",
      ),
    );
    state.userId = "B";
    state.user = { clerkId: "A" };
    view.rerender(
      <CacheProvider>
        <Probe />
      </CacheProvider>,
    );
    expect(screen.queryByTestId("identity")).toBeNull();
    expect(screen.queryByText(/A secret note/)).toBeNull();
    state.user = undefined;
    view.rerender(
      <CacheProvider>
        <Probe />
      </CacheProvider>,
    );
    expect(screen.queryByTestId("identity")).toBeNull();
    state.user = null;
    view.rerender(
      <CacheProvider>
        <Probe />
      </CacheProvider>,
    );
    expect(screen.queryByTestId("identity")).toBeNull();
    state.user = { clerkId: "B" };
    view.rerender(
      <CacheProvider>
        <Probe />
      </CacheProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("identity").textContent).toContain("user-B"),
    );
    expect(screen.queryByText(/A secret note/)).toBeNull();
    state.loaded = false;
    await act(async () =>
      view.rerender(
        <CacheProvider>
          <Probe />
        </CacheProvider>,
      ),
    );
    expect(screen.queryByTestId("identity")).toBeNull();
    expect(() => getCache()).toThrow();
  });
});
