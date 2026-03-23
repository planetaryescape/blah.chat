import type { PersistenceEnv } from "../env";

export interface TriggerHealthResponse {
  data?: unknown[];
  pagination?: Record<string, unknown>;
}

export interface TriggerRunResponse {
  id?: string;
}

export interface TriggerRetrieveRunResponse {
  id?: string;
  status?: string;
  isQueued?: boolean;
  isExecuting?: boolean;
  isWaiting?: boolean;
  isCompleted?: boolean;
  isSuccess?: boolean;
  isFailed?: boolean;
  isCancelled?: boolean;
  output?: unknown;
  error?: {
    message?: string;
    name?: string;
    stackTrace?: string;
  };
}

export function createTriggerClient(env: Pick<PersistenceEnv, "trigger">) {
  return {
    async ping(): Promise<TriggerHealthResponse> {
      if (!env.trigger.secretKey) {
        throw new Error("TRIGGER_SECRET_KEY is not set");
      }

      const response = await fetch(
        `${env.trigger.apiUrl}/api/v1/runs?limit=1`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${env.trigger.secretKey}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const body = await response.text();
        const suffix = body ? ` ${body}` : "";
        throw new Error(
          `Trigger health check failed: ${response.status}${suffix}`,
        );
      }

      return (await response.json()) as TriggerHealthResponse;
    },

    async triggerTask(
      taskId: string,
      payload: Record<string, unknown>,
    ): Promise<TriggerRunResponse> {
      if (!env.trigger.secretKey) {
        throw new Error("TRIGGER_SECRET_KEY is not set");
      }

      const response = await fetch(
        `${env.trigger.apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.trigger.secretKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payload }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        const suffix = body ? ` ${body}` : "";
        throw new Error(`Trigger task failed: ${response.status}${suffix}`);
      }

      return (await response.json()) as TriggerRunResponse;
    },

    async retrieveRun(runId: string): Promise<TriggerRetrieveRunResponse> {
      if (!env.trigger.secretKey) {
        throw new Error("TRIGGER_SECRET_KEY is not set");
      }

      const response = await fetch(
        `${env.trigger.apiUrl}/api/v3/runs/${encodeURIComponent(runId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${env.trigger.secretKey}`,
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const body = await response.text();
        const suffix = body ? ` ${body}` : "";
        throw new Error(
          `Trigger run lookup failed: ${response.status}${suffix}`,
        );
      }

      return (await response.json()) as TriggerRetrieveRunResponse;
    },
  };
}
