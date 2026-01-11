// BYOD Functions v10 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 10, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 10,
    provider: "blah.chat",
    type: "byod",
  }),
});
