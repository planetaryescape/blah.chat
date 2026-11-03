// BYOD Functions v37 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({
    status: "ok",
    version: 37,
    timestamp: Date.now(),
  }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 37,
    provider: "blah.chat",
    type: "byod",
  }),
});
