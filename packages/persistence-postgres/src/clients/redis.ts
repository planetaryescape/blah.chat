import { Redis } from "@upstash/redis";
import type { PersistenceEnv } from "../env";

export interface RedisLike {
  ping(): Promise<unknown>;
  rpush(key: string, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  lrange<T>(key: string, start: number, end: number): Promise<T[]>;
  setex(key: string, seconds: number, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  get<T>(key: string): Promise<T | null>;
}

class UpstashRedisClient implements RedisLike {
  constructor(private readonly client: Redis) {}

  ping() {
    return this.client.ping();
  }

  rpush(key: string, value: string) {
    return this.client.rpush(key, value);
  }

  expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  lrange<T>(key: string, start: number, end: number) {
    return this.client.lrange<T>(key, start, end);
  }

  setex(key: string, seconds: number, value: unknown) {
    return this.client.setex(key, seconds, value);
  }

  del(key: string) {
    return this.client.del(key);
  }

  get<T>(key: string) {
    return this.client.get<T>(key);
  }
}

export function createRedisClient(
  env: Pick<PersistenceEnv, "redis">,
): RedisLike {
  return new UpstashRedisClient(
    new Redis({
      url: env.redis.restUrl,
      token: env.redis.restToken,
    }),
  );
}
