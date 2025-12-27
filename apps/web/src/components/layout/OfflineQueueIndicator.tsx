"use client";

import { Loader2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { messageQueue } from "@/lib/offline/messageQueue";

/**
 * Floating indicator showing queued message count
 * Displays when messages are queued offline, auto-hides when queue empty
 */
export function OfflineQueueIndicator() {
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Initial count
    const updateCount = () => {
      setQueueCount(messageQueue.getCount());
    };

    updateCount();

    // Listen for queue changes
    window.addEventListener("queue-updated", updateCount);

    return () => {
      window.removeEventListener("queue-updated", updateCount);
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
        {navigator.onLine && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
}
