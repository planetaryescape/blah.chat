// BYOD Functions v3 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 3, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 3,
    provider: "blah.chat",
    type: "byod",
  }),
});
