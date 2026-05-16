import { task } from "@trigger.dev/sdk";

export interface ProcessGenerationDeps {
  baseUrl?: string;
  secret?: string;
  fetch?: typeof fetch;
}

export interface ProcessGenerationResult {
  status: "success" | "error";
  sys: { entity: string; id?: string };
  data?: { requestId: string; status: string };
  error?: unknown;
}

function formatUnexpectedBody(body: string) {
  return body.trim().replace(/\s+/g, " ").slice(0, 200);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export async function processGeneration(
  payload: { requestId: string },
  deps: ProcessGenerationDeps = {},
): Promise<ProcessGenerationResult> {
  const baseUrl = deps.baseUrl ?? requireEnv("INTERNAL_TASK_BASE_URL");
  const secret = deps.secret ?? requireEnv("INTERNAL_TASK_SECRET");
  const fetchFn = deps.fetch ?? fetch;

  const url = `${baseUrl.replace(/\/$/, "")}/api/internal/generations/${encodeURIComponent(payload.requestId)}/process`;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `process-generation HTTP ${response.status}${body ? `: ${formatUnexpectedBody(body)}` : ""}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `process-generation expected JSON from ${url} but received ${contentType || "unknown content-type"}${body ? `: ${formatUnexpectedBody(body)}` : ""}`,
    );
  }

  return (await response.json()) as ProcessGenerationResult;
}

export const processGenerationTask = task({
  id: "process-generation",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { requestId: string }) => processGeneration(payload),
});
