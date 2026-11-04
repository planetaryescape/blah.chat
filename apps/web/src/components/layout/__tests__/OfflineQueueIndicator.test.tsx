/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";
import { messageQueue } from "@/lib/offline/messageQueue";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("sonner", () => ({ toast: notifications }));

import { OfflineQueueIndicator } from "../OfflineQueueIndicator";

afterEach(() => vi.clearAllMocks());

it.each([
  false,
  true,
])("handles Retry without a mounted composer (queue read failure: %s)", async (readFails) => {
  const cache = new BlahChatCache(`indicator-${crypto.randomUUID()}`);
  await cache.open();
  setActiveCache(cache);
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  const view = render(<OfflineQueueIndicator />);
  const read = cache.Collection.prototype.toArray;
  const fault = vi.spyOn(cache.Collection.prototype, "toArray");
  try {
    await messageQueue.enqueueReplayable({
      conversationId: "queued-conversation" as Id<"conversations">,
      content: "retry from settings",
      clientMessageId: "indicator-original-key",
    });
    const retry = await screen.findByRole("button", { name: "Retry" });
    if (readFails)
      fault
        .mockImplementationOnce(function (
          this: typeof cache.Collection.prototype,
        ) {
          return read.call(this, (rows) => rows);
        })
        .mockRejectedValueOnce(new Error("Synthetic IndexedDB read failure"));
    fireEvent.click(retry);
    if (readFails) {
      await waitFor(() =>
        expect(notifications.error).toHaveBeenCalledWith(
          "Saved requests could not be read. Try again.",
        ),
      );
      expect(navigation.push).not.toHaveBeenCalled();
      return;
    }
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
    fault.mockRestore();
    view.unmount();
    setActiveCache(null);
    cache.close();
    await cache.delete();
  }
});
