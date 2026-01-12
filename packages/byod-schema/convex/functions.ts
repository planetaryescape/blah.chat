// BYOD Functions v18 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 18, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({ schemaVersion: 18, provider: "blah.chat", type: "byod" }),
});
