// BYOD Functions v6 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 6, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({ schemaVersion: 6, provider: "blah.chat", type: "byod" }),
});
