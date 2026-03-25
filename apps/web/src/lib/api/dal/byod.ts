import {
  disconnectByod,
  getByodConfig,
  getByodMigrationLogs,
  setupByodNeon,
  testByodConnection,
} from "@/lib/persistence/byod";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

export const byodDAL = {
  get: async (clerkUserId: string) => {
    return getByodConfig(clerkUserId);
  },

  setup: async (clerkUserId: string, connectionString: string) => {
    const result = await setupByodNeon(clerkUserId, connectionString);
    return formatEntity(result, "byod");
  },

  testConnection: async (clerkUserId: string) => {
    const result = await testByodConnection(clerkUserId);
    return formatEntity(result, "byod-test");
  },

  disconnect: async (clerkUserId: string) => {
    const result = await disconnectByod(clerkUserId);
    return formatEntity(result, "byod");
  },

  getMigrations: async (clerkUserId: string) => {
    const logs = await getByodMigrationLogs(clerkUserId);
    return formatEntityList(logs, "byod-migration");
  },
};
