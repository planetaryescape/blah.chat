// BYOD Functions v12 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 12, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 12,
    provider: "blah.chat",
    type: "byod",
  }),
});
