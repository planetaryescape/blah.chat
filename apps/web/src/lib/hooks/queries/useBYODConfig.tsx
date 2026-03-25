"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import type { ByodConfigSafe } from "@/lib/persistence/byod";

const BYOD_QUERY_KEY = ["byod-config"];

async function fetchByodConfig(): Promise<ByodConfigSafe | null> {
  const res = await fetch("/api/v1/byod");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch BYOD config");
  const json = await res.json();
  return json.data as ByodConfigSafe;
}

interface BYODContextType {
  isEnabled: boolean;
  isLoading: boolean;
  config: ByodConfigSafe | null;
  error: string | null;
  mutate: () => void;
}

const BYODContext = createContext<BYODContextType>({
  isEnabled: false,
  isLoading: true,
  config: null,
  error: null,
  mutate: () => {},
});

export function BYODProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: BYOD_QUERY_KEY,
    queryFn: fetchByodConfig,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const mutate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BYOD_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<BYODContextType>(() => {
    const config = data ?? null;
    const isEnabled = config?.connectionStatus === "connected";
    const connectionError = config?.connectionError ?? null;

    return {
      isEnabled,
      isLoading,
      config,
      error: error ? String(error) : connectionError,
      mutate,
    };
  }, [data, isLoading, error, mutate]);

  return <BYODContext.Provider value={value}>{children}</BYODContext.Provider>;
}

export function useBYOD(): BYODContextType {
  return useContext(BYODContext);
}

export function useBYODEnabled(): boolean {
  const { isEnabled } = useBYOD();
  return isEnabled;
}

export function useBYODConfig(): {
  config: ByodConfigSafe | null;
  isLoading: boolean;
  mutate: () => void;
} {
  const { config, isLoading, mutate } = useBYOD();
  return { config, isLoading, mutate };
}

export function useBYODBlockingError(): {
  isBlocking: boolean;
  error: string | null;
} {
  const { config, error } = useBYOD();
  const isBlocking =
    config !== null && config.connectionStatus === "error" && error !== null;
  return { isBlocking, error: isBlocking ? error : null };
}
