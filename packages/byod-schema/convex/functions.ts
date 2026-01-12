// BYOD Functions v19 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 19, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 19,
    provider: "blah.chat",
    type: "byod",
  }),
});
