// BYOD Functions v15 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({ status: "ok", version: 15, timestamp: Date.now() }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({ schemaVersion: 15, provider: "blah.chat", type: "byod" }),
});
