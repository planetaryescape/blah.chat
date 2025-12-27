import type { RefObject } from "react";

interface UseChatInputKeyboardProps {
  input: string;
  setInput: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
}

/**
 * Hook for chat input keyboard handling.
 * Handles Enter to submit and Cmd+$ for math block insertion.
 */
export function useChatInputKeyboard({
  input,
  setInput,
  textareaRef,
  onSubmit,
}: UseChatInputKeyboardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter without Shift submits the form
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }

    // Cmd/Ctrl+$ - Insert math block template
    if ((e.metaKey || e.ctrlKey) && e.key === "$") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = input.substring(0, start);
      const after = input.substring(end);

      const template = "$$\n\n$$";
      const newValue = before + template + after;
      setInput(newValue);

      // Position cursor inside math block (after $$\n)
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  return { handleKeyDown };
}
