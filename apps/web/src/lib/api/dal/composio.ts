import {
  initiateComposioConnection,
  listComposioConnections,
  revokeComposioConnection,
} from "@/lib/persistence/composio";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

export const composioDAL = {
  list: async (clerkUserId: string) => {
    const items = await listComposioConnections(clerkUserId);
    return formatEntityList(items, "composio_connection");
  },

  initiate: async (
    clerkUserId: string,
    input: {
      integrationId: string;
      redirectUrl: string;
    },
  ) => {
    const result = await initiateComposioConnection(clerkUserId, input);
    return formatEntity(result, "composio_connection", result.connectionId);
  },

  revoke: async (
    clerkUserId: string,
    input: {
      integrationId: string;
    },
  ) => {
    const result = await revokeComposioConnection(clerkUserId, input);
    return formatEntity(result, "composio_connection");
  },
};
