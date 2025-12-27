import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks BEFORE imports
const mockRouterPush = vi.fn();
const mockStartNewChat = vi.fn();
const mockConversations = [
  { _id: "conv-1", _creationTime: 3000 },
  { _id: "conv-2", _creationTime: 2000 },
  { _id: "conv-3", _creationTime: 1000 },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/chat/conv-2",
}));

vi.mock("@/contexts/ConversationContext", () => ({
  useConversationContext: () => ({
    filteredConversations: mockConversations,
  }),
}));

vi.mock("@/hooks/useNewChat", () => ({
  useNewChat: () => ({ startNewChat: mockStartNewChat }),
}));

// Import AFTER mocks
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

// Helper to dispatch keyboard events with proper target
const dispatchKey = (
  key: string,
  options: Partial<KeyboardEventInit> = {},
  target: HTMLElement = document.body,
) => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...options,
  });
  Object.defineProperty(event, "target", { value: target, writable: false });
  window.dispatchEvent(event);
};

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Cmd+J dispatches open-quick-model-switcher event", () => {
    const eventHandler = vi.fn();
    window.addEventListener("open-quick-model-switcher", eventHandler);

    renderHook(() => useKeyboardShortcuts());

    dispatchKey("j", { metaKey: true });

    expect(eventHandler).toHaveBeenCalled();
    window.removeEventListener("open-quick-model-switcher", eventHandler);
  });

  it("Alt+N calls startNewChat", () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey("n", { altKey: true, code: "KeyN" });

    expect(mockStartNewChat).toHaveBeenCalled();
  });

  it("Cmd+; dispatches open-quick-template-switcher event", () => {
    const eventHandler = vi.fn();
    window.addEventListener("open-quick-template-switcher", eventHandler);

    renderHook(() => useKeyboardShortcuts());

    dispatchKey(";", { metaKey: true });

    expect(eventHandler).toHaveBeenCalled();
    window.removeEventListener("open-quick-template-switcher", eventHandler);
  });

  it("Cmd+, navigates to settings", () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(",", { metaKey: true });

    expect(mockRouterPush).toHaveBeenCalledWith("/settings");
  });

  it("Cmd+] navigates to next conversation", () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey("]", { metaKey: true });

    // conv-2 is current, conv-3 is next (sorted by _creationTime desc)
    expect(mockRouterPush).toHaveBeenCalledWith("/chat/conv-3");
  });

  it("Cmd+[ navigates to previous conversation", () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey("[", { metaKey: true });

    // conv-2 is current, conv-1 is previous (sorted by _creationTime desc)
    expect(mockRouterPush).toHaveBeenCalledWith("/chat/conv-1");
  });

  it("Cmd+F only works outside of input elements", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);

    // In input - should NOT navigate
    dispatchKey("f", { metaKey: true }, input);
    expect(mockRouterPush).not.toHaveBeenCalled();

    // Outside input - should navigate
    dispatchKey("f", { metaKey: true });
    expect(mockRouterPush).toHaveBeenCalledWith("/search");

    document.body.removeChild(input);
  });

  it("Cmd+1-9 jumps to numbered conversation", () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey("1", { metaKey: true });

    expect(mockRouterPush).toHaveBeenCalledWith("/chat/conv-1");
  });
});
