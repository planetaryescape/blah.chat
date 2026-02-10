import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createOptimisticMessage } from "@/lib/test/factories";
import { useOptimisticMessages } from "../useOptimisticMessages";

describe("useOptimisticMessages", () => {
  it("orders by _creationTime over createdAt (server insertion order)", () => {
    const now = Date.now();
    const user = {
      _id: "u-1",
      _creationTime: now,
      conversationId: "c-1",
      userId: "user-1",
      role: "user",
      content: "Hello",
      status: "complete",
      createdAt: now + 1000,
      updatedAt: now + 1000,
    } as any;

    const assistant = {
      _id: "a-1",
      _creationTime: now + 1,
      conversationId: "c-1",
      userId: "user-1",
      role: "assistant",
      content: "Hi",
      status: "complete",
      createdAt: now,
      updatedAt: now,
    } as any;

    const { result } = renderHook(() =>
      useOptimisticMessages({ serverMessages: [assistant, user] }),
    );

    const roles = (result.current.messages ?? []).map((m: any) => m.role);
    expect(roles).toEqual(["user", "assistant"]);
  });

  it("orders user before assistant when createdAt ties", () => {
    const now = Date.now();
    const assistant = {
      _id: "a-1",
      _creationTime: now,
      conversationId: "c-1",
      userId: "u-1",
      role: "assistant",
      content: "Hi",
      status: "complete",
      createdAt: now,
      updatedAt: now,
    } as any;

    const user = {
      _id: "u-2",
      _creationTime: now,
      conversationId: "c-1",
      userId: "u-1",
      role: "user",
      content: "Hello",
      status: "complete",
      createdAt: now,
      updatedAt: now,
    } as any;

    const { result } = renderHook(() =>
      useOptimisticMessages({ serverMessages: [assistant, user] }),
    );

    const roles = (result.current.messages ?? []).map((m: any) => m.role);
    expect(roles[0]).toBe("user");
    expect(roles[1]).toBe("assistant");
  });

  it("does not drop optimistic msg when server msg is within time window but content differs", () => {
    const now = Date.now();
    const optimistic = createOptimisticMessage({
      _id: "temp-1" as any,
      role: "user",
      content: "A",
      createdAt: now,
      updatedAt: now,
      _creationTime: now,
    });

    const serverMsg = {
      _id: "msg-1",
      _creationTime: now + 1,
      conversationId: optimistic.conversationId,
      userId: "user-1",
      role: "user",
      content: "B",
      status: "complete",
      createdAt: now + 5,
      updatedAt: now + 5,
    } as any;

    const { result } = renderHook(() =>
      useOptimisticMessages({ serverMessages: [serverMsg] }),
    );

    act(() => {
      result.current.addOptimisticMessages([optimistic]);
    });

    const ids = (result.current.messages ?? []).map((m: any) => String(m._id));
    expect(ids).toContain("temp-1");
    expect(ids).toContain("msg-1");
  });

  it("drops optimistic msg when server msg matches content within window", () => {
    const now = Date.now();
    const optimistic = createOptimisticMessage({
      _id: "temp-2" as any,
      role: "user",
      content: "Same",
      createdAt: now,
      updatedAt: now,
      _creationTime: now,
    });

    const serverMsg = {
      _id: "msg-2",
      _creationTime: now + 1,
      conversationId: optimistic.conversationId,
      userId: "user-1",
      role: "user",
      content: "Same",
      status: "complete",
      createdAt: now + 50,
      updatedAt: now + 50,
    } as any;

    const { result } = renderHook(() =>
      useOptimisticMessages({ serverMessages: [serverMsg] }),
    );

    act(() => {
      result.current.addOptimisticMessages([optimistic]);
    });

    const ids = (result.current.messages ?? []).map((m: any) => String(m._id));
    expect(ids).toContain("msg-2");
    expect(ids).not.toContain("temp-2");
  });
});
