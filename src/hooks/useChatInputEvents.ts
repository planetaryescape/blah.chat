import { useEffect, type RefObject } from "react";

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
  useEffect(() => {
    if (isEmpty && !isMobile && !isTouchDevice && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, isMobile, isTouchDevice, textareaRef]);

  // Auto-focus input after AI message generation completes
  useEffect(() => {
    if (
      !isMobile &&
      lastAssistantMessageStatus === "complete" &&
      lastAssistantMessageId !== lastCompletedMessageId &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      setLastCompletedMessageId(lastAssistantMessageId!);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [
    lastAssistantMessageStatus,
    lastAssistantMessageId,
    lastCompletedMessageId,
    setLastCompletedMessageId,
    isMobile,
    textareaRef,
  ]);
}
