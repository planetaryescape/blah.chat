// BYOD Functions v33 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({
    status: "ok",
    version: 33,
    timestamp: Date.now(),
  }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 33,
    provider: "blah.chat",
    type: "byod",
  }),
});
