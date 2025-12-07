"use client";

import { useSelection } from "@/contexts/SelectionContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Quote,
  Search,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { SummarizePopover } from "@/components/notes/SummarizePopover";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";

interface MenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
}

export function SelectionContextMenu() {
  const { selection, clearSelection } = useSelection();
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Popover and note dialog state
  const [showSummarizePopover, setShowSummarizePopover] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [currentMessageId, setCurrentMessageId] =
    useState<Id<"messages"> | null>(null);

  // Convex mutations and actions
  // @ts-ignore - Convex type instantiation depth issue
  const createSnippet = useMutation(api.snippets.createSnippet);
  const createMemoryFromSelection = useAction(
    api.memories.createMemoryFromSelection,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate menu position when selection changes
  useEffect(() => {
    if (!selection.isActive || !selection.rect) return;

    const rect = selection.rect;
    const menuWidth = 240; // Approximate menu width
    const menuHeight = 280; // Approximate menu height
    const gap = 8;

    // Try to position above selection
    let top = rect.top + window.scrollY - menuHeight - gap;
    let left = rect.left + window.scrollX + rect.width / 2 - menuWidth / 2;

    // If menu would be clipped at top, position below
    if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + gap;
    }

    // Keep menu within viewport horizontally
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setPosition({ top, left });
    setSelectedIndex(0); // Reset selection when menu repositions
  }, [selection.isActive, selection.rect]);

  const handleQuote = () => {
    window.dispatchEvent(
      new CustomEvent("insert-prompt", {
        detail: `with reference to this: "${selection.text}" `,
      }),
    );
    toast.success("Text quoted in input");
    clearSelection();
  };

  const handleSearch = () => {
    const query = encodeURIComponent(selection.text);
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
    clearSelection();
  };

  const handleBookmarkSnippet = async () => {
    try {
      await createSnippet({
        text: selection.text,
        sourceMessageId: selection.messageId as Id<"messages">,
      });
      toast.success("Snippet bookmarked");
      clearSelection();
    } catch (error) {
      console.error("Failed to bookmark snippet:", error);
      toast.error("Failed to bookmark snippet");
    }
  };

  const handleSummarize = () => {
    if (!selection.rect) return;

    // Reset state first to prevent showing stale popover
    setCurrentMessageId(null);
    setSummaryText("");
    setShowSummarizePopover(false);

    // Calculate popover position from selection rect
    const rect = selection.rect;
    setPopoverPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });

    // Store current message ID for note creation
    setCurrentMessageId(selection.messageId as Id<"messages">);

    // Open popover after state cleanup (on next tick)
    setTimeout(() => {
      setShowSummarizePopover(true);
    }, 0);

    clearSelection();
  };

  const handleSaveAsNoteFromSummary = (summary: string) => {
    setSummaryText(summary);
    setShowSummarizePopover(false);
    setShowCreateNote(true);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setShowSummarizePopover(open);
    if (!open) {
      // Reset state when popover closes to prevent it from showing on next selection
      setCurrentMessageId(null);
      setSummaryText("");
    }
  };

  const handleAddToMemory = async () => {
    try {
      toast.info("Adding to memory...");
      await createMemoryFromSelection({
        content: selection.text,
        sourceMessageId: selection.messageId as Id<"messages">,
      });
      toast.success("Added to memory");
      clearSelection();
    } catch (error) {
      console.error("Failed to add to memory:", error);
      toast.error("Failed to add to memory");
    }
  };

  const actions: MenuAction[] = [
    {
      id: "quote",
      label: "Quote",
      icon: Quote,
      shortcut: "Q",
      action: handleQuote,
    },
    {
      id: "search",
      label: "Search Google",
      icon: Search,
      shortcut: "S",
      action: handleSearch,
    },
    {
      id: "bookmark",
      label: "Bookmark Snippet",
      icon: Tag,
      shortcut: "B",
      action: handleBookmarkSnippet,
      disabled: selection.messageRole === "user", // Can't bookmark own messages
    },
    {
      id: "summarize",
      label: "Summarize",
      icon: Sparkles,
      shortcut: "M",
      action: handleSummarize,
      disabled: selection.messageRole === "user",
    },
    {
      id: "memory",
      label: "Add to Memory",
      icon: Brain,
      shortcut: "A",
      action: handleAddToMemory,
    },
  ];

  const enabledActions = actions.filter((action) => !action.disabled);

  // Keyboard navigation
  useEffect(() => {
    if (!selection.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < enabledActions.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : enabledActions.length - 1,
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        enabledActions[selectedIndex]?.action();
        return;
      }

      // Shortcut keys
      const pressedKey = e.key.toUpperCase();
      const action = enabledActions.find(
        (a) => a.shortcut?.toUpperCase() === pressedKey,
      );
      if (action) {
        e.preventDefault();
        action.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection.isActive, selectedIndex, enabledActions, clearSelection]);

  if (!mounted || !selection.isActive) return null;

  const menu = (
    <AnimatePresence>
      {selection.isActive && (
        <motion.div
          ref={menuRef}
          className="selection-context-menu fixed z-50"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          role="menu"
          aria-label="Text selection actions"
        >
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[240px]">
            <div className="p-2 space-y-0.5">
              {enabledActions.map((action, index) => {
                const Icon = action.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isSelected
                        ? "bg-white/10 ring-1 ring-white/20"
                        : "hover:bg-white/5"
                    }`}
                    role="menuitem"
                    aria-selected={isSelected}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-primary" : "text-white/60"
                      }`}
                    />
                    <span
                      className={`flex-1 text-left text-sm font-medium ${
                        isSelected ? "text-white" : "text-white/80"
                      }`}
                    >
                      {action.label}
                    </span>
                    {action.shortcut && (
                      <kbd
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20">
              <p className="text-[10px] text-white/40 font-medium">
                ↑↓ Navigate • Enter Select • Esc Close
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(menu, document.body)}

      {/* Summarize Popover */}
      {mounted && showSummarizePopover && currentMessageId && (
        <SummarizePopover
          open={showSummarizePopover}
          onOpenChange={handlePopoverOpenChange}
          selectedText={selection.text}
          sourceMessageId={currentMessageId}
          position={popoverPosition}
          onSaveAsNote={handleSaveAsNoteFromSummary}
        />
      )}

      {/* Create Note Dialog */}
      {mounted && currentMessageId && (
        <CreateNoteDialog
          open={showCreateNote}
          onOpenChange={setShowCreateNote}
          initialContent={summaryText}
          sourceMessageId={currentMessageId}
          sourceConversationId={undefined}
          sourceSelectionText={selection.text}
        />
      )}
    </>
  );
}
