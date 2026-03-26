import type { GenerationEventStore } from "../generation-v2/types";

const TERMINAL_EVENT_TYPES = new Set(["complete", "cancelled", "error"]);

export interface RedisStreamHealthInput {
  store: GenerationEventStore;
  requestIds: string[];
  now: number;
  staleTtlMs: number;
}

export interface RedisStreamHealthResult {
  healthyStreams: string[];
  staleStreams: string[];
}

export async function checkRedisStreamHealth(
  input: RedisStreamHealthInput,
): Promise<RedisStreamHealthResult> {
  const healthyStreams: string[] = [];
  const staleStreams: string[] = [];

  for (const requestId of input.requestIds) {
    const { events } = await input.store.read(requestId);

    if (events.length === 0) {
      staleStreams.push(requestId);
      continue;
    }

    const hasTerminal = events.some((e) => TERMINAL_EVENT_TYPES.has(e.type));
    if (hasTerminal) {
      healthyStreams.push(requestId);
      continue;
    }

    const latestTs = Math.max(...events.map((e) => e.ts));
    const age = input.now - latestTs;

    if (age > input.staleTtlMs) {
      staleStreams.push(requestId);
    } else {
      healthyStreams.push(requestId);
    }
  }

  return { healthyStreams, staleStreams };
}
