import { describe, expect, it } from "vitest";
import {
  fromHttpConversations,
  fromHttpMessages,
  fromPaginatedConversations,
  fromPaginatedMessages,
} from "./chat";

describe("transport adapter parity", () => {
  it("normalizes conversations from both adapters to same shape", () => {
    const sample = [{ _id: "conv_1" }, { _id: "conv_2" }];

    const convex = fromPaginatedConversations(sample);
    const http = fromHttpConversations({ items: sample, total: 2 });

    expect(convex.items).toEqual(http.items);
    expect(convex.pagination.total).toBe(http.pagination.total);
    expect(convex.pagination.page).toBe(1);
    expect(http.pagination.page).toBe(1);
  });

  it("normalizes messages from both adapters to same shape", () => {
    const sample = [{ _id: "msg_1" }];

    const convex = fromPaginatedMessages(sample, false);
    const http = fromHttpMessages(sample);

    expect(convex.items).toEqual(http.items);
    expect(convex.pagination.hasNext).toBe(false);
    expect(http.pagination.hasNext).toBe(false);
  });
});
