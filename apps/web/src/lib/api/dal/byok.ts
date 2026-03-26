import {
  disableByok,
  enableByok,
  getByokConfig,
  removeByokApiKey,
  saveByokApiKey,
} from "@/lib/persistence/byok";
import type { KeyType } from "@/lib/security/byok";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

export const byokDAL = {
  get: async (clerkUserId: string) => {
    return await getByokConfig(clerkUserId);
  },

  saveKey: async (
    clerkUserId: string,
    input: {
      keyType: KeyType;
      apiKey: string;
      skipValidation?: boolean;
    },
  ) => {
    const result = await saveByokApiKey(clerkUserId, input);
    return formatEntity(result, "byok");
  },

  removeKey: async (
    clerkUserId: string,
    input: {
      keyType: KeyType;
    },
  ) => {
    const result = await removeByokApiKey(clerkUserId, input);
    return formatEntity(result, "byok");
  },

  enable: async (clerkUserId: string) => {
    const result = await enableByok(clerkUserId);
    return formatEntity(result, "byok");
  },

  disable: async (clerkUserId: string) => {
    const result = await disableByok(clerkUserId);
    return formatEntity(result, "byok");
  },
};
