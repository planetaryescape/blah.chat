import { create } from "zustand";

interface TemplateStore {
  /**
   * The template prompt text to be inserted into chat input.
   * Stored here temporarily when navigating from templates page to chat.
   */
  pendingTemplateText: string | null;

  /**
   * Template name for analytics/display purposes
   */
  pendingTemplateName: string | null;

  /**
   * Set the pending template text (called when "Use" is clicked)
   */
  setTemplateText: (text: string, name?: string) => void;

  /**
   * Get and clear the pending template text (called by chat page)
   * Returns null if no pending template
   */
  consumeTemplateText: () => { text: string; name: string } | null;

  /**
   * Clear without consuming (e.g., on navigation away)
   */
  clear: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  pendingTemplateText: null,
  pendingTemplateName: null,

  setTemplateText: (text: string, name?: string) => {
    set({
      pendingTemplateText: text,
      pendingTemplateName: name || null,
    });
  },

  consumeTemplateText: () => {
    const { pendingTemplateText, pendingTemplateName } = get();
    if (!pendingTemplateText) return null;

    // Clear after consuming
    set({ pendingTemplateText: null, pendingTemplateName: null });

    return {
      text: pendingTemplateText,
      name: pendingTemplateName || "Template",
    };
  },

  clear: () => {
    set({ pendingTemplateText: null, pendingTemplateName: null });
  },
}));
