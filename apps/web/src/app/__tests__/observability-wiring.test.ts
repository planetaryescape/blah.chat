/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import instrumentationSource from "../../../instrumentation.ts?raw";
import browserConfigSource from "../../../instrumentation-client.ts?raw";
import edgeConfigSource from "../../../sentry.edge.config.ts?raw";
import serverConfigSource from "../../../sentry.server.config.ts?raw";

describe("production observability wiring", () => {
  it("registers Sentry request-error capture for server and edge runtimes", () => {
    expect(instrumentationSource).toContain("sentry.server.config");
    expect(instrumentationSource).toContain("sentry.edge.config");
    expect(instrumentationSource).toContain("Sentry.captureRequestError");
  });

  it("keeps Sentry PII disabled in server, edge, and browser configs", () => {
    for (const config of [
      serverConfigSource,
      edgeConfigSource,
      browserConfigSource,
    ]) {
      expect(config).toContain("Sentry.init");
      expect(config).toContain("sendDefaultPii: false");
      expect(config).not.toContain("sendDefaultPii: true");
    }
  });
});
