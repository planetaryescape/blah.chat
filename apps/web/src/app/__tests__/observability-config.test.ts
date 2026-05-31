/**
 * @vitest-environment node
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();

async function readWebFile(path: string) {
  return readFile(join(webRoot, path), "utf8");
}

describe("production observability wiring", () => {
  it("registers Sentry request-error capture for server and edge runtimes", async () => {
    const instrumentation = await readWebFile("instrumentation.ts");

    expect(instrumentation).toContain("sentry.server.config");
    expect(instrumentation).toContain("sentry.edge.config");
    expect(instrumentation).toContain("Sentry.captureRequestError");
  });

  it("keeps Sentry PII disabled in server, edge, and browser configs", async () => {
    const configs = await Promise.all([
      readWebFile("sentry.server.config.ts"),
      readWebFile("sentry.edge.config.ts"),
      readWebFile("instrumentation-client.ts"),
    ]);

    for (const config of configs) {
      expect(config).toContain("Sentry.init");
      expect(config).toContain("sendDefaultPii: false");
      expect(config).not.toContain("sendDefaultPii: true");
    }
  });
});
