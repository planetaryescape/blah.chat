/**
 * Type-safe custom events used throughout the app.
 * These extend WindowEventMap for proper typing with useEventListener from usehooks-ts.
 */
declare global {
  interface WindowEventMap {
    // Chat input events
    "insert-prompt": CustomEvent<string>;
    "focus-chat-input": CustomEvent<void>;
    "quote-selection": CustomEvent<string>;

    // Quick switcher events
    "open-quick-model-switcher": CustomEvent<void>;
    "open-quick-template-switcher": CustomEvent<void>;
    "open-model-preview": CustomEvent<{ modelId: string }>;

    // Note events
    "create-new-note": CustomEvent<void>;
    "clear-note-selection": CustomEvent<void>;
    "save-message-as-note": CustomEvent<void>;

    // Sidebar events
    "open-new-incognito-dialog": CustomEvent<void>;

    // Offline queue events
    "queue-updated": CustomEvent<void>;
  }
}

export {};
