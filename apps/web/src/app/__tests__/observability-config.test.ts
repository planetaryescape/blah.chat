/**
 * @vitest-environment node
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production observability wiring", () => {
  it("registers Sentry request-error capture for server and edge runtimes", async () => {
    const instrumentation = await readFile("instrumentation.ts", "utf8");

    expect(instrumentation).toContain("sentry.server.config");
    expect(instrumentation).toContain("sentry.edge.config");
    expect(instrumentation).toContain("Sentry.captureRequestError");
  });

  it("keeps Sentry PII disabled in server, edge, and browser configs", async () => {
    const configs = await Promise.all([
      readFile("sentry.server.config.ts", "utf8"),
      readFile("sentry.edge.config.ts", "utf8"),
      readFile("instrumentation-client.ts", "utf8"),
    ]);

    for (const config of configs) {
      expect(config).toContain("Sentry.init");
      expect(config).toContain("sendDefaultPii: false");
      expect(config).not.toContain("sendDefaultPii: true");
    }
  });
});
