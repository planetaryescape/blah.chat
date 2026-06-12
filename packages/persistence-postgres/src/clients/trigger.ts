import type { PersistenceEnv } from "../env";

export interface TriggerHealthResponse {
  data?: unknown[];
  pagination?: Record<string, unknown>;
}

export interface TriggerRunResponse {
  id?: string;
}

export interface TriggerTaskOptions {
  /** Dedupes trigger calls: same key within the TTL returns the existing run. */
  idempotencyKey?: string;
  /** TTL for the idempotency key, e.g. "1h", "10m". Defaults to 30 days on the Trigger.dev side. */
  idempotencyKeyTTL?: string;
  /** Serializes runs sharing the same key within the task's queue. */
  concurrencyKey?: string;
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
      options?: TriggerTaskOptions,
    ): Promise<TriggerRunResponse> {
      if (!env.trigger.secretKey) {
        throw new Error("TRIGGER_SECRET_KEY is not set");
      }

      const body: Record<string, unknown> = { payload };
      if (options?.idempotencyKey || options?.concurrencyKey) {
        body.options = {
          ...(options.idempotencyKey
            ? {
                idempotencyKey: options.idempotencyKey,
                ...(options.idempotencyKeyTTL
                  ? { idempotencyKeyTTL: options.idempotencyKeyTTL }
                  : {}),
              }
            : {}),
          ...(options.concurrencyKey
            ? { concurrencyKey: options.concurrencyKey }
            : {}),
        };
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
          body: JSON.stringify(body),
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
