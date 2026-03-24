import { afterEach, describe, expect, it } from "bun:test";
import {
  getMobileTransportMode,
  shouldUseConvexTransport,
  supportsR2BlobTransport,
} from "./mode";

const originalTransport = process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;

describe("mobile transport mode", () => {
  afterEach(() => {
    if (originalTransport === undefined) {
      delete process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;
    } else {
      process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = originalTransport;
    }
  });

  it("defaults to http-sse for rewrite-safe blob flows", () => {
    delete process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;

    expect(getMobileTransportMode()).toBe("http-sse");
    expect(shouldUseConvexTransport()).toBe(false);
    expect(supportsR2BlobTransport()).toBe(true);
  });

  it("disables R2 blob flows when convex transport is explicitly forced", () => {
    process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "convex";

    expect(getMobileTransportMode()).toBe("convex");
    expect(shouldUseConvexTransport()).toBe(true);
    expect(supportsR2BlobTransport()).toBe(false);
  });
});
