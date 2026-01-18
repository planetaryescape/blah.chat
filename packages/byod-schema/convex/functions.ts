// BYOD Functions v34 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({
    status: "ok",
    version: 34,
    timestamp: Date.now(),
  }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 34,
    provider: "blah.chat",
    type: "byod",
  }),
});
