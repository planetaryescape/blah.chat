import {
  createCliApiKey,
  listCliApiKeys,
  revokeCliApiKey,
} from "@/lib/persistence/cliApiKeys";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

export const cliApiKeysDAL = {
  list: async (clerkUserId: string) => {
    const items = await listCliApiKeys(clerkUserId);
    return formatEntityList(items, "cli_api_key");
  },

  create: async (clerkUserId: string, input: { name?: string }) => {
    const result = await createCliApiKey(clerkUserId, input);
    return formatEntity(result, "cli_api_key");
  },

  revoke: async (clerkUserId: string, keyId: string) => {
    const result = await revokeCliApiKey(clerkUserId, keyId);
    return formatEntity(result, "cli_api_key", keyId);
  },
};
