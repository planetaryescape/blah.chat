import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/cache/context");

const state = vi.hoisted(() => ({
  loaded: true,
  userId: "A" as string | null,
  authenticated: true,
  user: { clerkId: "A" } as { clerkId: string } | null | undefined,
  databases: new Map<string, Map<string, Map<string, unknown>>>(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: state.loaded, userId: state.userId }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: state.authenticated,
  }),
  useQuery: () => state.user,
}));
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
import { useUserCache } from "@/lib/cache/context";
import { BlahChatCache, getCache, setActiveCache } from "@/lib/cache/db";
import { syncMessageTree } from "@/lib/cache/messageTree";
import { getSiblingsForMessage } from "../useCacheSync";

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
  beforeEach(() => {
    state.databases.clear();
    state.loaded = true;
    state.userId = "A";
    state.authenticated = true;
    state.user = { clerkId: "A" };
    setActiveCache(null);
  });

  it("keeps regenerated inactive siblings and unloaded history while removing actual tree orphans", async () => {
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
    await syncMessageTree(cache, conversationId, rows as never);
    expect((await cache.messages.toArray()).map((row) => row._id)).toEqual([
      "root",
      "old-version",
      "new-version",
    ]);
    const messages = await cache.messages.toArray();
    expect(getSiblingsForMessage(messages, messages[2])).toHaveLength(2);
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
