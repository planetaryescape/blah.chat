import { describe, expect, it } from "vitest";
import {
  getMobileTransportMode,
  shouldUseConvexTransport,
  supportsR2BlobTransport,
} from "./mode";

// These functions return constants defining the mobile transport contract.
// Other modules depend on these values — if any changes, SSE streaming
// and blob upload code must be updated in lockstep.

describe("getMobileTransportMode", () => {
  it("returns http-sse as the transport mode", () => {
    expect(getMobileTransportMode()).toBe("http-sse");
  });

  it("returns a string (type contract for consumers)", () => {
    expect(typeof getMobileTransportMode()).toBe("string");
  });
});

describe("shouldUseConvexTransport", () => {
  it("returns false — mobile never uses Convex WebSocket transport", () => {
    expect(shouldUseConvexTransport()).toBe(false);
  });
});

describe("supportsR2BlobTransport", () => {
  it("returns true — mobile supports R2 blob uploads", () => {
    expect(supportsR2BlobTransport()).toBe(true);
  });
});
