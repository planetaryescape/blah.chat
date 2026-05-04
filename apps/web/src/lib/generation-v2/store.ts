import type { RedisLike } from "@blah-chat/persistence-postgres";
import {
  type GenerationEvent,
  generationCancelKey,
  generationEventSchema,
  generationRequestMetaKey,
  generationSessionStateKey,
} from "@blah-chat/streaming-core";
import type { GenerationEventStore } from "./types";

const STREAM_TTL_SECONDS = 60 * 60;

function generationEventListKey(requestId: string) {
  return `${generationRequestMetaKey(requestId)}:events`;
}

function generationSessionCancelKey(sessionId: string) {
  return `${generationSessionStateKey(sessionId)}:cancel`;
}

export class RedisGenerationEventStore implements GenerationEventStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly ttlSeconds = STREAM_TTL_SECONDS,
  ) {}

  async append(requestId: string, event: GenerationEvent) {
    const key = generationEventListKey(requestId);
    const length = await this.redis.rpush(key, JSON.stringify(event));
    await this.redis.expire(key, this.ttlSeconds);
    return length - 1;
  }

  async read(requestId: string, cursor = -1) {
    const key = generationEventListKey(requestId);
    const raw = await this.redis.lrange<GenerationEvent | string>(
      key,
      cursor + 1,
      -1,
    );
    const events = raw.map((value) =>
      generationEventSchema.parse(
        typeof value === "string" ? JSON.parse(value) : value,
      ),
    );
    return {
      events,
      nextCursor: cursor + events.length,
    };
  }

  async setCancelled(requestId: string, cancelled: boolean) {
    const key = generationCancelKey(requestId);
    if (cancelled) {
      await this.redis.setex(key, this.ttlSeconds, "1");
      return;
    }

    await this.redis.del(key);
  }

  async isCancelled(requestId: string) {
    const value = await this.redis.get<string>(generationCancelKey(requestId));
    return value === "1";
  }

  async setSessionCancelled(sessionId: string, cancelled: boolean) {
    const key = generationSessionCancelKey(sessionId);
    if (cancelled) {
      await this.redis.setex(key, this.ttlSeconds, "1");
      return;
    }

    await this.redis.del(key);
  }

  async isSessionCancelled(sessionId: string) {
    const value = await this.redis.get<string>(
      generationSessionCancelKey(sessionId),
    );
    return value === "1";
  }

  async setRequestStatus(requestId: string, status: string) {
    await this.redis.setex(
      generationRequestMetaKey(requestId),
      this.ttlSeconds,
      {
        status,
        updatedAt: Date.now(),
      },
    );
  }

  async getRequestStatus(requestId: string) {
    const value = await this.redis.get<{ status?: string }>(
      generationRequestMetaKey(requestId),
    );
    return value?.status ?? null;
  }
}

export class MemoryGenerationEventStore implements GenerationEventStore {
  private readonly events = new Map<string, GenerationEvent[]>();
  private readonly cancelled = new Set<string>();
  private readonly sessionCancelled = new Set<string>();
  private readonly status = new Map<string, string>();

  async append(requestId: string, event: GenerationEvent) {
    const events = this.events.get(requestId) ?? [];
    events.push(event);
    this.events.set(requestId, events);
    return events.length - 1;
  }

  async read(requestId: string, cursor = -1) {
    const events = this.events.get(requestId) ?? [];
    const next = events.slice(cursor + 1);
    return {
      events: next,
      nextCursor: cursor + next.length,
    };
  }

  async setCancelled(requestId: string, cancelled: boolean) {
    if (cancelled) {
      this.cancelled.add(requestId);
      return;
    }

    this.cancelled.delete(requestId);
  }

  async isCancelled(requestId: string) {
    return this.cancelled.has(requestId);
  }

  async setSessionCancelled(sessionId: string, cancelled: boolean) {
    if (cancelled) {
      this.sessionCancelled.add(sessionId);
      return;
    }

    this.sessionCancelled.delete(sessionId);
  }

  async isSessionCancelled(sessionId: string) {
    return this.sessionCancelled.has(sessionId);
  }

  async setRequestStatus(requestId: string, status: string) {
    this.status.set(requestId, status);
  }

  async getRequestStatus(requestId: string) {
    return this.status.get(requestId) ?? null;
  }
}
