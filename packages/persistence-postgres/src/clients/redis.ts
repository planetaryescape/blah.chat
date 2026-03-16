import { Redis } from "@upstash/redis";
import type { PersistenceEnv } from "../env";

export function createRedisClient(env: Pick<PersistenceEnv, "redis">) {
  return new Redis({
    url: env.redis.restUrl,
    token: env.redis.restToken,
  });
}
