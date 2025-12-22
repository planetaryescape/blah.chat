"use client";

import { useAction, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  type LucideIcon,
  Quote,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { SummarizePopover } from "@/components/notes/SummarizePopover";
import { useSelection } from "@/contexts/SelectionContext";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  const [selectedTextForSummary, setSelectedTextForSummary] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [currentMessageId, setCurrentMessageId] =
    useState<Id<"messages"> | null>(null);

  // Convex mutations and actions
  // @ts-ignore
  const createSnippet = useMutation(api.snippets.createSnippet);
  // @ts-ignore
  const createMemoryFromSelection = useAction(
    api.memories.createMemoryFromSelection
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate menu position when selection changes
  useEffect(() => {
    if (!selection.isActive || !selection.rect) return;

    const rect = selection.rect;
    const mousePos = selection.mousePosition;
    const menuWidth = 240; // Approximate menu width
    const menuHeight = 280; // Approximate menu height
    const gap = 8; // Small gap from cursor
    const padding = 10; // Viewport padding

    let top: number;
    let left: number;

    if (mousePos) {
      // Strategy: Position menu near mouse cursor (like a context menu)
      // Default: slightly below and to the right of cursor
      top = mousePos.y + window.scrollY + gap;
      left = mousePos.x + window.scrollX + gap;

      // Check if menu would overflow viewport on the right
      if (left + menuWidth > window.innerWidth - padding) {
        // Flip to left of cursor
        left = mousePos.x + window.scrollX - menuWidth - gap;
      }

      // Check if menu would overflow viewport on the bottom
      if (top + menuHeight > window.scrollY + window.innerHeight - padding) {
        // Flip above cursor
        top = mousePos.y + window.scrollY - menuHeight - gap;
      }

      // Final safety checks: ensure menu stays in viewport
      if (left < padding) {
        left = padding;
      }
      if (top < window.scrollY + padding) {
        top = window.scrollY + padding;
      }
    } else {
      // Fallback: use selection rect if mouse position not available
      // Position at the end of selection
      top = rect.bottom + window.scrollY + gap;
      left = rect.right + window.scrollX - menuWidth;

      // If menu would be clipped at bottom, position above
      if (top + menuHeight > window.scrollY + window.innerHeight - padding) {
        top = rect.top + window.scrollY - menuHeight - gap;
      }

      // Keep menu within viewport horizontally
      if (left < padding) {
        left = rect.left + window.scrollX;
      }
      if (left + menuWidth > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth - padding;
      }
    }

    setPosition({ top, left });
    setSelectedIndex(0); // Reset selection when menu repositions
  }, [selection.isActive, selection.rect, selection.mousePosition]);

  // Auto-close popover when new text is selected
  useEffect(() => {
    if (selection.isActive && showSummarizePopover) {
      setShowSummarizePopover(false);
      setCurrentMessageId(null);
      setSummaryText("");
      setSelectedTextForSummary("");
    }
  }, [selection.isActive, showSummarizePopover]);

  const handleQuote = () => {
    window.dispatchEvent(
      new CustomEvent("quote-selection", {
        detail: selection.text,
      })
    );
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

    const mousePos = selection.mousePosition;
    const rect = selection.rect;

    // Use mouse position if available, otherwise fall back to rect
    if (mousePos) {
      setPopoverPosition({
        top: mousePos.y,
        left: mousePos.x,
      });
    } else {
      // Fallback to selection rect
      setPopoverPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }

    // Store selected text BEFORE clearing selection
    setSelectedTextForSummary(selection.text);

    // Store current message ID and open popover
    setCurrentMessageId(selection.messageId as Id<"messages">);
    setSummaryText("");
    setShowSummarizePopover(true);

    // Clear selection - component stays mounted because popover is open
    clearSelection();
  };

  const handleSaveAsNoteFromSummary = (summary: string) => {
    // Update summary text and open dialog FIRST
    setSummaryText(summary);
    setShowCreateNote(true);
    // Then close popover (next tick to ensure state is updated)
    setTimeout(() => {
      setShowSummarizePopover(false);
    }, 0);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setShowSummarizePopover(open);
    if (!open && !showCreateNote) {
      // Only reset state when popover closes AND note dialog is not open
      setCurrentMessageId(null);
      setSummaryText("");
      setSelectedTextForSummary("");
    }
  };

  const handleNoteDialogOpenChange = (open: boolean) => {
    setShowCreateNote(open);
    if (!open) {
      // Reset state when note dialog closes
      setCurrentMessageId(null);
      setSummaryText("");
      setSelectedTextForSummary("");
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
    // TODO: https://github.com/planetaryescape/blah.chat/issues/21
    // {
    //   id: "bookmark",
    //   label: "Bookmark Snippet",
    //   icon: Tag,
    //   shortcut: "B",
    //   action: handleBookmarkSnippet,
    //   disabled: selection.messageRole === "user", // Can't bookmark own messages
    // },
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
          prev < enabledActions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : enabledActions.length - 1
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
        (a) => a.shortcut?.toUpperCase() === pressedKey
      );
      if (action) {
        e.preventDefault();
        action.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection.isActive, selectedIndex, enabledActions, clearSelection]);

  if (!mounted) return null;

  // Don't unmount if popover is showing - keep component alive for popover
  if (!selection.isActive && !showSummarizePopover && !showCreateNote)
    return null;

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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-white/10 ring-1 ring-white/20"
                        : "hover:bg-white/5"
                    }`}
                    role="menuitem"
                    aria-current={isSelected ? "true" : undefined}
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
      {mounted && showSummarizePopover && (
        <SummarizePopover
          open={showSummarizePopover}
          onOpenChange={handlePopoverOpenChange}
          selectedText={selectedTextForSummary}
          position={popoverPosition}
          onSaveAsNote={handleSaveAsNoteFromSummary}
        />
      )}

      {/* Create Note Dialog */}
      {mounted && currentMessageId && (
        <CreateNoteDialog
          open={showCreateNote}
          onOpenChange={handleNoteDialogOpenChange}
          initialContent={summaryText}
          sourceMessageId={currentMessageId}
          sourceConversationId={undefined}
          sourceSelectionText={selectedTextForSummary}
        />
      )}
    </>
  );
}
