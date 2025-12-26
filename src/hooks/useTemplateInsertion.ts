"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Handles template insertion from sessionStorage after navigation
 * from the templates page.
 *
 * When user clicks "Use Template" on templates page:
 * 1. Template text stored in sessionStorage
 * 2. Navigates to chat with ?insertTemplate=true
 * 3. This hook reads sessionStorage and dispatches insert-prompt event
 * 4. Cleans up URL param
 */
export function useTemplateInsertion(): void {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const insertTemplate = searchParams.get("insertTemplate");
    if (insertTemplate !== "true") return;

    // Read template text from sessionStorage
    const templateText = sessionStorage.getItem("pending-template-text");
    if (templateText) {
      // Clear sessionStorage
      sessionStorage.removeItem("pending-template-text");

      // Dispatch insert-prompt event after a brief delay to ensure ChatInput is mounted
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("insert-prompt", { detail: templateText }),
        );
        window.dispatchEvent(new CustomEvent("focus-chat-input"));
      }, 100);
    }

    // Clean up URL param
    const url = new URL(window.location.href);
    url.searchParams.delete("insertTemplate");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, router]);
}
