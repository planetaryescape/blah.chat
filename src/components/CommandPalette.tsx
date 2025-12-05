"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { analytics } from "@/lib/analytics";
import { Command } from "cmdk";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  Download,
  Laptop,
  MessageSquarePlus,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  // @ts-ignore
  const conversations = useQuery(api.conversations.list, {});
  const createConversation = useMutation(api.conversations.create);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNewChat = async () => {
    try {
      const conversationId = await createConversation({
        model: "openai:gpt-4o",
      });
      router.push(`/chat/${conversationId}`);
      setOpen(false);
      analytics.track("conversation_started", { model: "openai:gpt-4o" });
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const handleTheme = (theme: "light" | "dark" | "system") => {
    setTheme(theme);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden bg-transparent border-0 shadow-2xl">
        <div className="surface-glass-strong rounded-xl border border-border/40 overflow-hidden">
          <Command className="bg-transparent">
            <div className="flex items-center border-b border-border/40 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Type a command or search..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              <Command.Group
                heading="Actions"
                className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
              >
                <Command.Item
                  onSelect={handleNewChat}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  <span>New Chat</span>
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    ⌘N
                  </kbd>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleNavigate("/search")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleNavigate("/bookmarks")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Bookmarks</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleNavigate("/settings")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    ⌘,
                  </kbd>
                </Command.Item>
                <Command.Item
                  onSelect={() =>
                    window.open("/api/export?format=json", "_blank")
                  }
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </Command.Item>
              </Command.Group>

              {conversations && conversations.length > 0 && (
                <Command.Group
                  heading="Recent Conversations"
                  className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
                >
                  {conversations.slice(0, 5).map((conv: any) => (
                    <Command.Item
                      key={conv._id}
                      onSelect={() => handleNavigate(`/chat/${conv._id}`)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                    >
                      <MessageSquarePlus className="h-4 w-4 opacity-70" />
                      <span className="truncate">{conv.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group
                heading="Theme"
                className="px-2 pb-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2"
              >
                <Command.Item
                  onSelect={() => handleTheme("light")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Sun className="h-4 w-4" />
                  <span>Light</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleTheme("dark")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Moon className="h-4 w-4" />
                  <span>Dark</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => handleTheme("system")}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm text-muted-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                >
                  <Laptop className="h-4 w-4" />
                  <span>System</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
