/**
 * Convex React Context for Ink
 *
 * Provides ConvexClient and apiKey to all child components.
 * Use with custom hooks like useMessages() for reactive subscriptions.
 */

import type { ConvexClient } from "convex/browser";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { getCredentials } from "../lib/auth.js";
import { closeConvexClient, getConvexClient } from "../lib/convex-client.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConvexContextValue {
  client: ConvexClient;
  apiKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ConvexContext = createContext<ConvexContextValue | null>(null);

/**
 * Hook to access Convex client and apiKey.
 * Must be used within ConvexProvider.
 */
export function useConvex(): ConvexContextValue {
  const ctx = useContext(ConvexContext);
  if (!ctx) {
    throw new Error("useConvex must be used within ConvexProvider");
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface ConvexProviderProps {
  children: ReactNode;
}

/**
 * Provider component that supplies ConvexClient and apiKey.
 * Throws if user is not logged in.
 */
export function ConvexProvider({ children }: ConvexProviderProps) {
  const credentials = getCredentials();

  if (!credentials) {
    throw new Error("Not logged in. Run: blah login");
  }

  const value: ConvexContextValue = {
    client: getConvexClient(),
    apiKey: credentials.apiKey,
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      closeConvexClient();
    };
  }, []);

  return (
    <ConvexContext.Provider value={value}>{children}</ConvexContext.Provider>
  );
}
