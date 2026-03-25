import type { ComposioConnection } from "@blah-chat/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSDKClient } from "@/lib/api/sdkClient";

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

  const sdk = useSDKClient();
  const queryClient = useQueryClient();

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["composio-connections"],
    queryFn: () => sdk.listComposioConnections(),
    staleTime: 15_000,
  });

  const initiateMutation = useMutation({
    mutationFn: (payload: { integrationId: string; redirectUrl: string }) =>
      sdk.initiateComposioConnection(payload),
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: { integrationId: string }) =>
      sdk.revokeComposioConnection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composio-connections"] });
    },
  });

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
        queryClient.invalidateQueries({ queryKey: ["composio-connections"] });
      } else {
        setStatus("error");
        setError(callbackError || "Connection failed");
        onError?.(callbackError || "Connection failed");
        toast.error(callbackError || "Failed to connect integration");
      }

      document.cookie =
        "composio_oauth_state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      pendingIntegrationRef.current = null;
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError, queryClient]);

  // Poll for popup close
  useEffect(() => {
    if (status !== "connecting" || !popupRef.current) return;

    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        setStatus("idle");
        setError(null);
        pendingIntegrationRef.current = null;
        popupRef.current = null;
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  const connect = useCallback(
    async (integrationId: string) => {
      setStatus("connecting");
      setError(null);
      pendingIntegrationRef.current = integrationId;

      try {
        const callbackUrl = `${window.location.origin}/api/composio/callback`;

        const result = await initiateMutation.mutateAsync({
          integrationId,
          redirectUrl: callbackUrl,
        });

        if (!result.redirectUrl) {
          throw new Error("No redirect URL returned");
        }

        if (result.state) {
          const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
          document.cookie = `composio_oauth_state=${result.state}; path=/; expires=${expires}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        }

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
    [initiateMutation, onError],
  );

  const disconnect = useCallback(
    async (integrationId: string) => {
      try {
        await revokeMutation.mutateAsync({ integrationId });
        toast.success("Integration disconnected");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Disconnect failed";
        toast.error(errorMessage);
        throw err;
      }
    },
    [revokeMutation],
  );

  const isConnected = useCallback(
    (integrationId: string) => {
      return connections?.some(
        (c: ComposioConnection) =>
          c.integrationId === integrationId && c.status === "active",
      );
    },
    [connections],
  );

  const getConnection = useCallback(
    (integrationId: string) => {
      return connections?.find(
        (c: ComposioConnection) => c.integrationId === integrationId,
      );
    },
    [connections],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    pendingIntegrationRef.current = null;
  }, []);

  return {
    status,
    error,
    connections: connections ?? [],
    isLoading: connectionsLoading,

    connect,
    disconnect,
    isConnected,
    getConnection,
    reset,
  };
}
