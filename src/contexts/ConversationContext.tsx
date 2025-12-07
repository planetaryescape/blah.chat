"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ConversationContextType {
  filteredConversations: Doc<"conversations">[] | undefined;
  setFilteredConversations: (
    conversations: Doc<"conversations">[] | undefined,
  ) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [filteredConversations, setFilteredConversations] = useState<
    Doc<"conversations">[] | undefined
  >(undefined);

  return (
    <ConversationContext.Provider
      value={{ filteredConversations, setFilteredConversations }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversationContext must be used within ConversationProvider",
    );
  }
  return context;
}
