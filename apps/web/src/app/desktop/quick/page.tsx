"use client";

import type { Conversation } from "@blah-chat/sdk";
import { Loader2, MessageSquare, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSDKClient } from "@/lib/api/sdkClient";
import { openMainWindow } from "@/lib/desktop/ipc";

const DEFAULT_MODEL = "openai:gpt-5-mini";

export default function DesktopQuickPage() {
  const router = useRouter();
  const sdk = useSDKClient();

  const [prompt, setPrompt] = useState("");
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recentItems = useMemo(() => recent.slice(0, 8), [recent]);

  const loadRecent = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const data = await sdk.listConversations({ limit: 12, archived: false });
      setRecent(data.items);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load conversations";
      toast.error(message);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [sdk]);

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

  const handleSend = useCallback(async () => {
    const content = prompt.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const conversation = await sdk.createConversation({
        model: DEFAULT_MODEL,
        title: "New Chat",
      });

      await sdk.sendMessage(conversation._id, {
        content,
        modelId: DEFAULT_MODEL,
      });

      setPrompt("");
      await openInMain(`/chat/${conversation._id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, openInMain, prompt, sdk]);

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
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask anything..."
              autoFocus
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
            <div className="space-y-2">
              {recentItems.map((conversation) => (
                <button
                  type="button"
                  key={conversation._id}
                  onClick={() => void openInMain(`/chat/${conversation._id}`)}
                  className="w-full text-left rounded-md border border-border/60 px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-medium truncate">
                    {conversation.title || "Untitled conversation"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {conversation.model || DEFAULT_MODEL}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
