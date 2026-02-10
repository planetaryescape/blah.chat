import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createOptimisticMessage } from "@/lib/test/factories";
import { useOptimisticMessages } from "../useOptimisticMessages";

describe("useOptimisticMessages", () => {
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
