// BYOD Functions v17 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 17, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({ schemaVersion: 17, provider: "blah.chat", type: "byod" }),
});
