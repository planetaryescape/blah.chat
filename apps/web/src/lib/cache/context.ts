"use client";

import { createContext, useContext } from "react";
import type { BlahChatCache } from "./db";

export const UserCacheContext = createContext<BlahChatCache | null>(null);

export function useUserCache(): BlahChatCache {
  const cache = useContext(UserCacheContext);
  if (!cache) throw new Error("Cache identity is not ready");
  return cache;
}
