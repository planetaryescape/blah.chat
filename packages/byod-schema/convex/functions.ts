// BYOD Functions v25 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 25, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({ schemaVersion: 25, provider: "blah.chat", type: "byod" }),
});
