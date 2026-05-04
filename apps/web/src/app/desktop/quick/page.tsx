"use client";

import type { Conversation } from "@blah-chat/api-client";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useNewChatModel } from "@/hooks/useNewChatModel";
import { useSDKClient } from "@/lib/api/sdkClient";
import { openMainWindow } from "@/lib/desktop/ipc";

const FALLBACK_MODEL = "openai:gpt-5-mini";
const PAGE_SIZE = 8;

export default function DesktopQuickPage() {
  const router = useRouter();
  const sdk = useSDKClient();
  const { newChatModel } = useNewChatModel();
  const model = newChatModel || FALLBACK_MODEL;

  const [prompt, setPrompt] = useState("");
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [page, setPage] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const recentItems = useMemo(
    () => recent.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [recent, page],
  );

  const { run: loadRecent, isPending: isLoadingRecent } = useAsyncAction(
    async () => {
      const data = await sdk.listConversations({ limit: 50, archived: false });
      setRecent(data.items);
    },
    {
      onError: (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load conversations";
        toast.error(message);
      },
    },
  );

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const openInMain = useCallback(
    async (route: string) => {
      const opened = await openMainWindow(route);
      if (!opened) {
        router.push(route);
      }
    },
    [router],
  );

  const { run: handleSend, isPending: isSubmitting } = useAsyncAction(
    async () => {
      const content = prompt.trim();
      if (!content) return;

      const conversation = await sdk.createConversation({
        model: model,
        title: "New Chat",
      });

      await sdk.sendMessage(conversation._id, {
        content,
        modelId: model,
      });

      setPrompt("");
      await openInMain(`/chat/${conversation._id}`);
    },
    {
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to send message";
        toast.error(message);
      },
    },
  );

  // Global keyboard handler for Escape and arrow navigation
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.close();
        return;
      }

      // Arrow key navigation in recent list
      if (event.key === "ArrowDown" && recentItems.length > 0) {
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev < recentItems.length - 1 ? prev + 1 : 0,
        );
      }
      if (event.key === "ArrowUp" && recentItems.length > 0) {
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : recentItems.length - 1,
        );
      }
      if (
        event.key === "Enter" &&
        focusedIndex >= 0 &&
        focusedIndex < recentItems.length
      ) {
        const conversation = recentItems[focusedIndex];
        if (conversation) {
          void openInMain(`/chat/${conversation._id}`);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [recentItems, focusedIndex, openInMain]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const buttons = listRef.current.querySelectorAll("[data-conversation]");
    buttons[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  // Reset focus when page changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [page]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-4 md:p-5 border-border/60 bg-card/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Companion
            </h1>
          </div>

          <div className="space-y-2">
            <Input
              ref={inputRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask anything..."
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void handleSend()}
                disabled={isSubmitting || prompt.trim().length === 0}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Send
              </Button>

              <Button
                variant="outline"
                onClick={() => void openInMain("/search")}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 border-border/60 bg-card/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Chats
            </h2>
            <Button variant="ghost" size="sm" onClick={() => void loadRecent()}>
              Refresh
            </Button>
          </div>

          {isLoadingRecent ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            <div ref={listRef} className="space-y-2">
              {recentItems.map((conversation, index) => (
                <button
                  type="button"
                  key={conversation._id}
                  data-conversation
                  onClick={() => void openInMain(`/chat/${conversation._id}`)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    index === focusedIndex
                      ? "border-primary/60 bg-accent"
                      : "border-border/60 hover:bg-accent"
                  }`}
                >
                  <div className="text-sm font-medium truncate">
                    {conversation.title || "Untitled conversation"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {conversation.model || model}
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
