"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * BYOD configuration returned from query
 */
interface BYODConfig {
  _id: Id<"userDatabaseConfig">;
  connectionStatus: "pending" | "connected" | "error" | "disconnected";
  lastConnectionTest?: number;
  connectionError?: string;
  schemaVersion: number;
  lastSchemaDeploy?: number;
  deploymentStatus?: "not_started" | "deploying" | "deployed" | "failed";
  deploymentProgress?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * BYOD context value
 */
interface BYODContextType {
  /** Whether BYOD is enabled and connected */
  isEnabled: boolean;
  /** Whether the config is still loading */
  isLoading: boolean;
  /** The full BYOD configuration (null if not configured) */
  config: BYODConfig | null;
  /** Any connection error message */
  error: string | null;
  /** Whether deployment is in progress */
  isDeploying: boolean;
  /** Whether there's a deployment failure */
  hasDeploymentError: boolean;
}

const BYODContext = createContext<BYODContextType>({
  isEnabled: false,
  isLoading: true,
  config: null,
  error: null,
  isDeploying: false,
  hasDeploymentError: false,
});

/**
 * Provider for BYOD configuration context
 * Wraps components that need access to BYOD status
 */
export function BYODProvider({ children }: { children: ReactNode }) {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const config = useQuery(api.byod.credentials.getConfig, {});

  const value = useMemo<BYODContextType>(() => {
    const isLoading = config === undefined;
    const isEnabled = config?.connectionStatus === "connected";
    const error = config?.connectionError || null;
    const isDeploying = config?.deploymentStatus === "deploying";
    const hasDeploymentError = config?.deploymentStatus === "failed";

    return {
      isEnabled,
      isLoading,
      config: config || null,
      error,
      isDeploying,
      hasDeploymentError,
    };
  }, [config]);

  return <BYODContext.Provider value={value}>{children}</BYODContext.Provider>;
}

/**
 * Hook to access BYOD context
 * Must be used within a BYODProvider
 */
export function useBYOD(): BYODContextType {
  return useContext(BYODContext);
}

/**
 * Hook to check if user has BYOD enabled and connected
 * Convenience wrapper for useBYOD().isEnabled
 */
export function useBYODEnabled(): boolean {
  const { isEnabled } = useBYOD();
  return isEnabled;
}

/**
 * Hook to get BYOD configuration
 * Returns null if not configured or not connected
 */
export function useBYODConfig(): BYODConfig | null {
  const { config } = useBYOD();
  return config;
}

/**
 * Hook to check if BYOD is in a blocking error state
 * Returns true if BYOD is configured but has a connection error
 */
export function useBYODBlockingError(): {
  isBlocking: boolean;
  error: string | null;
} {
  const { config, error } = useBYOD();

  // Only blocking if BYOD was configured (has a config) but now has an error
  const isBlocking =
    config !== null && config.connectionStatus === "error" && error !== null;

  return { isBlocking, error: isBlocking ? error : null };
}

/**
 * Hook to check deployment status
 */
export function useBYODDeployment(): {
  isDeploying: boolean;
  hasFailed: boolean;
  progress: string | null;
  schemaVersion: number | null;
  lastDeploy: number | null;
} {
  const { config, isDeploying, hasDeploymentError } = useBYOD();

  return {
    isDeploying,
    hasFailed: hasDeploymentError,
    progress: config?.deploymentProgress || null,
    schemaVersion: config?.schemaVersion || null,
    lastDeploy: config?.lastSchemaDeploy || null,
  };
}
