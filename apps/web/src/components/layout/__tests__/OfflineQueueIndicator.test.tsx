/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { messageQueue } from "@/lib/offline/messageQueue";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { OfflineQueueIndicator } from "../OfflineQueueIndicator";

afterEach(() => vi.clearAllMocks());

it("opens the saved conversation when Retry is used without a mounted composer", async () => {
  const cache = new BlahChatCache(`indicator-${crypto.randomUUID()}`);
  await cache.open();
  setActiveCache(cache);
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  const view = render(<OfflineQueueIndicator />);
  try {
    await messageQueue.enqueueReplayable({
      conversationId: "queued-conversation" as Id<"conversations">,
      content: "retry from settings",
      clientMessageId: "indicator-original-key",
    });
    const retry = await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(retry);
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/chat/queued-conversation"),
    );
    expect(await messageQueue.getQueue()).toMatchObject([
      {
        clientMessageId: "indicator-original-key",
        conversationId: "queued-conversation",
      },
    ]);
  } finally {
    view.unmount();
    setActiveCache(null);
    cache.close();
    await cache.delete();
  }
});
