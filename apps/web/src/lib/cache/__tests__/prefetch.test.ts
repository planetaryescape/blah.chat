import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMessages, mockConversations } = vi.hoisted(() => ({
  mockMessages: {
    bulkGet: vi.fn(),
    bulkPut: vi.fn(async () => {}),
  },
  mockConversations: {
    get: vi.fn(),
    put: vi.fn(async () => {}),
  },
}));

vi.mock("@/lib/cache/db", () => ({
  cache: {
    messages: mockMessages,
    conversations: mockConversations,
  },
}));

import {
  prefetchConversationIntoCache,
  prefetchMessagesIntoCache,
} from "../prefetch";

describe("prefetchMessagesIntoCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes rows with no local counterpart", async () => {
    mockMessages.bulkGet.mockResolvedValue([undefined]);

    await prefetchMessagesIntoCache([{ _id: "m1", updatedAt: 100 }]);

    expect(mockMessages.bulkPut).toHaveBeenCalledWith([
      { _id: "m1", updatedAt: 100 },
    ]);
  });

  it("skips rows whose local counterpart is newer", async () => {
    mockMessages.bulkGet.mockResolvedValue([
      { _id: "m1", updatedAt: 200, status: "complete" },
    ]);

    await prefetchMessagesIntoCache([{ _id: "m1", updatedAt: 100 }]);

    expect(mockMessages.bulkPut).not.toHaveBeenCalled();
  });

  it("skips rows whose local counterpart is streaming, even if the snapshot looks newer", async () => {
    mockMessages.bulkGet.mockResolvedValue([
      { _id: "m1", updatedAt: 100, status: "generating" },
      { _id: "m2", updatedAt: 100, status: "pending" },
    ]);

    await prefetchMessagesIntoCache([
      { _id: "m1", updatedAt: 999 },
      { _id: "m2", updatedAt: 999 },
    ]);

    expect(mockMessages.bulkPut).not.toHaveBeenCalled();
  });

  it("writes only the rows that pass the guards", async () => {
    mockMessages.bulkGet.mockResolvedValue([
      { _id: "m1", updatedAt: 200, status: "complete" },
      { _id: "m2", updatedAt: 50, status: "complete" },
      undefined,
    ]);

    await prefetchMessagesIntoCache([
      { _id: "m1", updatedAt: 100 },
      { _id: "m2", updatedAt: 100 },
      { _id: "m3", updatedAt: 100 },
    ]);

    expect(mockMessages.bulkPut).toHaveBeenCalledWith([
      { _id: "m2", updatedAt: 100 },
      { _id: "m3", updatedAt: 100 },
    ]);
  });

  it("does nothing for an empty snapshot", async () => {
    await prefetchMessagesIntoCache([]);

    expect(mockMessages.bulkGet).not.toHaveBeenCalled();
    expect(mockMessages.bulkPut).not.toHaveBeenCalled();
  });
});

describe("prefetchConversationIntoCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes when no local conversation exists", async () => {
    mockConversations.get.mockResolvedValue(undefined);

    await prefetchConversationIntoCache({ _id: "c1", updatedAt: 100 });

    expect(mockConversations.put).toHaveBeenCalledWith({
      _id: "c1",
      updatedAt: 100,
    });
  });

  it("skips when the local conversation is newer", async () => {
    mockConversations.get.mockResolvedValue({ _id: "c1", updatedAt: 200 });

    await prefetchConversationIntoCache({ _id: "c1", updatedAt: 100 });

    expect(mockConversations.put).not.toHaveBeenCalled();
  });

  it("writes when the snapshot is at least as new", async () => {
    mockConversations.get.mockResolvedValue({ _id: "c1", updatedAt: 100 });

    await prefetchConversationIntoCache({ _id: "c1", updatedAt: 100 });

    expect(mockConversations.put).toHaveBeenCalled();
  });
});
