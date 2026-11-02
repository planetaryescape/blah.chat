/**
 * Hook for managing Composio OAuth flow
 *
 * Handles popup-based OAuth with fallback to redirect flow.
 * Listens for postMessage from callback page to detect completion.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ComposioConnection = Doc<"composioConnections">;

type ConnectionStatus = "idle" | "connecting" | "success" | "error";

interface UseComposioOAuthOptions {
  onSuccess?: (integrationId: string) => void;
  onError?: (error: string) => void;
}

export function useComposioOAuth(options: UseComposioOAuthOptions = {}) {
  const { onSuccess, onError } = options;

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pendingIntegrationRef = useRef<string | null>(null);

  // @ts-ignore - Type depth exceeded with Convex modules
  const initiateConnection = useAction(api.composio.oauth.initiateConnection);
  // @ts-ignore - Type depth exceeded with Convex modules
  const revokeConnection = useAction(api.composio.oauth.revokeConnection);
  // @ts-ignore - Type depth exceeded with Convex modules
  const connections = useQuery(api.composio.connections.listConnections, {});

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our origin
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "composio-oauth-callback") return;

      const { success, error: callbackError } = event.data;

      if (success) {
        setStatus("success");
        setError(null);
        if (pendingIntegrationRef.current) {
          onSuccess?.(pendingIntegrationRef.current);
          toast.success("Integration connected successfully");
        }
      } else {
        setStatus("error");
        setError(callbackError || "Connection failed");
        onError?.(callbackError || "Connection failed");
        toast.error(callbackError || "Failed to connect integration");
      }

      // Clean up CSRF state cookie
      document.cookie =
        "composio_oauth_state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // Clean up
      pendingIntegrationRef.current = null;
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);

  // Poll for popup close (in case user closes it manually)
  useEffect(() => {
    if (status !== "connecting" || !popupRef.current) return;

    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        // User closed popup without completing OAuth
        setStatus("idle");
        setError(null);
        pendingIntegrationRef.current = null;
        popupRef.current = null;
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  /**
   * Connect to an integration
   */
  const connect = useCallback(
    async (integrationId: string) => {
      setStatus("connecting");
      setError(null);
      pendingIntegrationRef.current = integrationId;

      try {
        // Build callback URL
        const callbackUrl = `${window.location.origin}/api/composio/callback`;

        // Start OAuth flow
        const result = await initiateConnection({
          integrationId,
          redirectUrl: callbackUrl,
        });

        if (!result.redirectUrl) {
          throw new Error("No redirect URL returned");
        }

        // SECURITY: Store CSRF state in cookie for validation
        if (result.state) {
          // Set cookie with secure flags (10 min expiry to match backend)
          const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
          document.cookie = `composio_oauth_state=${result.state}; path=/; expires=${expires}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        }

        // Try popup flow first
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          result.redirectUrl,
          "composio-oauth",
          `width=${width},height=${height},left=${left},top=${top},popup=yes`,
        );

        if (popup) {
          popupRef.current = popup;
          popup.focus();
        } else {
          // Popup blocked - fall back to redirect
          window.location.href = result.redirectUrl;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setStatus("error");
        setError(errorMessage);
        onError?.(errorMessage);
        toast.error(errorMessage);
        pendingIntegrationRef.current = null;
      }
    },
    [initiateConnection, onError],
  );

  /**
   * Disconnect from an integration
   */
  const disconnect = useCallback(
    async (integrationId: string) => {
      try {
        await revokeConnection({ integrationId });
        toast.success("Integration disconnected");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Disconnect failed";
        toast.error(errorMessage);
        throw err;
      }
    },
    [revokeConnection],
  );

  /**
   * Check if an integration is connected
   */
  const isConnected = useCallback(
    (integrationId: string) => {
      return connections?.some(
        (c: ComposioConnection) =>
          c.integrationId === integrationId && c.status === "active",
      );
    },
    [connections],
  );

  /**
   * Get connection for an integration
   */
  const getConnection = useCallback(
    (integrationId: string) => {
      return connections?.find(
        (c: ComposioConnection) => c.integrationId === integrationId,
      );
    },
    [connections],
  );

  /**
   * Reset status to idle
   */
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    pendingIntegrationRef.current = null;
  }, []);

  return {
    // State
    status,
    error,
    connections: connections ?? [],
    isLoading: connections === undefined,

    // Actions
    connect,
    disconnect,
    isConnected,
    getConnection,
    reset,
  };
}
