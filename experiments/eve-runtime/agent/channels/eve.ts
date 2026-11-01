import { timingSafeEqual } from "node:crypto";
import { eveChannel } from "eve/channels/eve";

// Single-operator LOCAL fixture, not Clerk or multi-tenant authorization.
export default eveChannel({
  auth: [
    async (request) => {
      const token = process.env.EVE_SPIKE_TOKEN;
      const presented = Buffer.from(request.headers.get("authorization") ?? "");
      const expected = Buffer.from(`Bearer ${token}`);
      if (
        !token ||
        presented.length !== expected.length ||
        !timingSafeEqual(presented, expected)
      ) {
        return null;
      }
      return {
        authenticator: "spike-token",
        issuer: "blah-chat-eve-spike",
        principalId: "spike-operator",
        principalType: "service" as const,
        subject: "spike-operator",
        attributes: {},
      };
    },
  ],
});
