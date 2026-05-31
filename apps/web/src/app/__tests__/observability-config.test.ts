/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import instrumentation from "../../../instrumentation.ts?raw";
import browserConfig from "../../../instrumentation-client.ts?raw";
import edgeConfig from "../../../sentry.edge.config.ts?raw";
import serverConfig from "../../../sentry.server.config.ts?raw";

describe("production observability wiring", () => {
  it("registers Sentry request-error capture for server and edge runtimes", () => {
    expect(instrumentation).toContain("sentry.server.config");
    expect(instrumentation).toContain("sentry.edge.config");
    expect(instrumentation).toContain("Sentry.captureRequestError");
  });

  it("keeps Sentry PII disabled in server, edge, and browser configs", () => {
    for (const config of [serverConfig, edgeConfig, browserConfig]) {
      expect(config).toContain("Sentry.init");
      expect(config).toContain("sendDefaultPii: false");
      expect(config).not.toContain("sendDefaultPii: true");
    }
  });
});
