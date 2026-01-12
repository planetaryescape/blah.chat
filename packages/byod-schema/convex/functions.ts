// BYOD Functions v13 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 13, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 13,
    provider: "blah.chat",
    type: "byod",
  }),
});
