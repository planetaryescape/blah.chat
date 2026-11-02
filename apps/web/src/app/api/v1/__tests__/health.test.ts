/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../health/route";

describe("Convex deployment readiness", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("checks the deployed model catalog instead of returning static success", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          value: { backend: "convex", modelsReady: true },
          logLines: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data.persistence.convex.status).toBe("ok");
    expect(fetch).toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not declare an unseeded backend ready", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "success",
            value: { backend: "convex", modelsReady: false },
            logLines: [],
          }),
          { status: 200 },
        ),
      ),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).data.status).toBe("degraded");
  });

  it("fails closed without a deployment URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await GET()).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not expose internal errors in a public response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private-configuration-value")),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-configuration-value");
  });
});
