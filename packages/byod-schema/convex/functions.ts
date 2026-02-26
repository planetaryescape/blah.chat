// BYOD Functions v36 - DO NOT EDIT
import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => ({
    status: "ok",
    version: 36,
    timestamp: Date.now(),
  }),
});

export const getSystemInfo = query({
  args: {},
  handler: async () => ({
    schemaVersion: 36,
    provider: "blah.chat",
    type: "byod",
  }),
});
