"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getActiveCache } from "@/lib/cache/db";
import { messageQueue } from "@/lib/offline/messageQueue";

/**
 * Floating indicator showing queued message count
 * Displays when messages are queued offline, auto-hides when queue empty
 */
export function OfflineQueueIndicator() {
  const router = useRouter();
  const ownerCache = getActiveCache();
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  useEffect(() => {
    // Initial count (async from Dexie)
    const updateCount = async () => {
      const count = await messageQueue.getCount();
      setQueueCount(count);
    };

    updateCount();

    // Listen for queue changes (event includes count)
    const handleQueueUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ count: number }>).detail;
      setQueueCount(detail.count);
    };

    window.addEventListener("queue-updated", handleQueueUpdate);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("queue-updated", handleQueueUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't render if queue is empty
  if (queueCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">
          {queueCount} message{queueCount > 1 ? "s" : ""} queued
        </span>
        {isOnline && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={async () => {
              if (!ownerCache || getActiveCache() !== ownerCache) return;
              try {
                await messageQueue.retryAllAttention(ownerCache);
                const queue = await messageQueue.getQueue(ownerCache);
                if (getActiveCache() !== ownerCache || !queue[0]) return;
                // The composer owns replay. Open it when Retry is used from
                // settings or another layout page with no mounted chat.
                router.push(`/chat/${queue[0].conversationId}`);
                window.dispatchEvent(new Event("online"));
              } catch {
                if (getActiveCache() === ownerCache)
                  toast.error("Saved requests could not be read. Try again.");
              }
            }}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
