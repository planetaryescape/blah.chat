import { type RefObject, useEffect, useRef } from "react";

interface UseChatInputEventsProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  setInput: (value: string | ((prev: string) => string)) => void;
  setQuote: (quote: string | null) => void;
  isEmpty: boolean;
  isMobile: boolean;
  isTouchDevice: boolean;
  lastAssistantMessageId?: string;
  lastAssistantMessageStatus?: string;
  lastCompletedMessageId: string | null;
  setLastCompletedMessageId: (id: string) => void;
}

/**
 * Hook for chat input custom event handling.
 * Manages insert-prompt, quote-selection, focus events, and auto-focus behavior.
 */
export function useChatInputEvents({
  textareaRef,
  setInput,
  setQuote,
  isEmpty,
  isMobile,
  isTouchDevice,
  lastAssistantMessageId,
  lastAssistantMessageStatus,
  lastCompletedMessageId,
  setLastCompletedMessageId,
}: UseChatInputEventsProps) {
  // Handle prompted actions from EmptyScreen
  useEffect(() => {
    const handleInsertPrompt = (e: CustomEvent<string>) => {
      setInput(e.detail);
      textareaRef.current?.focus();
    };

    window.addEventListener("insert-prompt" as any, handleInsertPrompt as any);
    return () => {
      window.removeEventListener(
        "insert-prompt" as any,
        handleInsertPrompt as any,
      );
    };
  }, [setInput, textareaRef]);

  // Handle quote selection
  useEffect(() => {
    const handleQuoteSelection = (e: CustomEvent<string>) => {
      setQuote(e.detail);
      textareaRef.current?.focus();
    };

    window.addEventListener(
      "quote-selection" as any,
      handleQuoteSelection as any,
    );
    return () => {
      window.removeEventListener(
        "quote-selection" as any,
        handleQuoteSelection as any,
      );
    };
  }, [setQuote, textareaRef]);

  // Handle focus restoration after dialogs close
  useEffect(() => {
    const handleFocusInput = () => {
      textareaRef.current?.focus();
    };

    window.addEventListener("focus-chat-input", handleFocusInput);
    return () => {
      window.removeEventListener("focus-chat-input", handleFocusInput);
    };
  }, [textareaRef]);

  // Autofocus on empty state (skip mobile/touch)
  // Only run once on mount when empty, not on every re-render
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (
      isEmpty &&
      !isMobile &&
      !isTouchDevice &&
      textareaRef.current &&
      !hasAutoFocused.current
    ) {
      hasAutoFocused.current = true;
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, isMobile, isTouchDevice, textareaRef]);

  // Auto-focus input after AI message generation completes
  // Track timeout for cleanup
  const completionFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    // Clear any pending focus timeout
    if (completionFocusTimerRef.current) {
      clearTimeout(completionFocusTimerRef.current);
      completionFocusTimerRef.current = null;
    }

    if (
      !isMobile &&
      lastAssistantMessageStatus === "complete" &&
      lastAssistantMessageId !== lastCompletedMessageId &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      setLastCompletedMessageId(lastAssistantMessageId!);
      completionFocusTimerRef.current = setTimeout(() => {
        // Only focus if user still isn't in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          textareaRef.current?.focus();
        }
        completionFocusTimerRef.current = null;
      }, 100);
    }

    return () => {
      if (completionFocusTimerRef.current) {
        clearTimeout(completionFocusTimerRef.current);
        completionFocusTimerRef.current = null;
      }
    };
  }, [
    lastAssistantMessageStatus,
    lastAssistantMessageId,
    lastCompletedMessageId,
    setLastCompletedMessageId,
    isMobile,
    textareaRef,
  ]);
}
