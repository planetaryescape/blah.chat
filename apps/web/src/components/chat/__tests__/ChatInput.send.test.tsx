/**
 * @vitest-environment jsdom
 */
import "fake-indexeddb/auto";
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ post: vi.fn() }));
const loadedOrdinaryConversation = vi.hoisted(() => ({
  _id: "ordinary-conversation",
  _creationTime: 1,
  userId: "ordinary-owner",
  title: "Ordinary chat",
}));

vi.mock("convex/react", () => ({
  useQuery: () => loadedOrdinaryConversation,
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ useApiClient: () => transport }));
vi.mock("@/lib/analytics", () => ({ analytics: { track: vi.fn() } }));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/hooks/useMobileDetect", () => ({
  useMobileDetect: () => ({ isMobile: false, isTouchDevice: false }),
}));
vi.mock("@/hooks/useBrowserFeature", () => ({ default: () => false }));
vi.mock("@/hooks/useChatInputEvents", () => ({ useChatInputEvents: () => {} }));
vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => ({ haptic: vi.fn() }),
}));
vi.mock("@/hooks/useIOSKeyboard", () => ({ useIOSKeyboard: () => {} }));
vi.mock("../IntegrationSelector", () => ({
  IntegrationSelector: () => null,
}));
vi.mock("../VoiceInput", () => ({ VoiceInput: () => null }));

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { ChatInput } from "../ChatInput";

describe("ChatInput ordinary conversation send binding", () => {
  let cache: BlahChatCache;
  let queryClient: QueryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    transport.post.mockReset();
    cache = new BlahChatCache(`chat-input-send-${crypto.randomUUID()}`);
    await cache.open();
    setActiveCache(cache);
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    transport.post.mockResolvedValue({
      conversationId: loadedOrdinaryConversation._id,
      messageId: "accepted-user-message",
      assistantMessageId: "accepted-assistant-message",
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete (loadedOrdinaryConversation as { isIncognito?: boolean })
      .isIncognito;
    setActiveCache(null);
    queryClient.clear();
    cache.close();
    await cache.delete();
  });

  it("sends from a loaded ordinary conversation whose document omits isIncognito", async () => {
    expect(Object.hasOwn(loadedOrdinaryConversation, "isIncognito")).toBe(
      false,
    );
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const user = userEvent.setup();
    render(
      <ChatInput
        conversationId={loadedOrdinaryConversation._id as Id<"conversations">}
        isGenerating={false}
        selectedModel={DEFAULT_MODEL_ID}
        onModelChange={vi.fn()}
        attachments={[]}
        onAttachmentsChange={vi.fn()}
      />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Message input"));
    await user.paste("Ordinary send must remain available");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(transport.post).toHaveBeenCalledOnce());
    await act(async () => {
      await Promise.resolve();
    });
    expect(transport.post.mock.calls[0]?.[1]).toMatchObject({
      content: "Ordinary send must remain available",
      clientMessageId: expect.any(String),
    });
    expect(await cache.pendingMutations.toArray()).toHaveLength(0);
  });

  it("does not persist an incognito send in the durable outbox", async () => {
    (loadedOrdinaryConversation as { isIncognito?: boolean }).isIncognito =
      true;
    const persist = vi.spyOn(cache.pendingMutations, "add");
    transport.post.mockImplementationOnce(async () => {
      expect(await cache.pendingMutations.toArray()).toHaveLength(0);
      return {
        conversationId: loadedOrdinaryConversation._id,
        messageId: "private-user-message",
        assistantMessageId: "private-assistant-message",
      };
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const user = userEvent.setup();
    render(
      <ChatInput
        conversationId={loadedOrdinaryConversation._id as Id<"conversations">}
        isGenerating={false}
        selectedModel={DEFAULT_MODEL_ID}
        onModelChange={vi.fn()}
        attachments={[]}
        onAttachmentsChange={vi.fn()}
      />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Message input"));
    await user.paste("private send");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(transport.post).toHaveBeenCalledOnce());
    expect(persist).not.toHaveBeenCalled();
    expect(await cache.pendingMutations.toArray()).toHaveLength(0);
  });

  it("preserves the draft and never dispatches when durable persistence fails", async () => {
    vi.spyOn(cache.pendingMutations, "add").mockRejectedValueOnce(
      new Error("Synthetic storage refusal"),
    );
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const user = userEvent.setup();
    render(
      <ChatInput
        conversationId={loadedOrdinaryConversation._id as Id<"conversations">}
        isGenerating={false}
        selectedModel={DEFAULT_MODEL_ID}
        onModelChange={vi.fn()}
        attachments={[]}
        onAttachmentsChange={vi.fn()}
      />,
      { wrapper },
    );
    const input = screen.getByLabelText("Message input");
    await user.click(input);
    await user.paste("Keep this unsaved draft");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(input).toHaveValue("Keep this unsaved draft"));
    expect(transport.post).not.toHaveBeenCalled();
    expect(await cache.pendingMutations.toArray()).toHaveLength(0);
  });
});
