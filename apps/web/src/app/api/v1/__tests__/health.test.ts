/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence/health", () => ({
  checkPersistenceHealth: vi.fn(),
}));

import { checkPersistenceHealth } from "@/lib/persistence/health";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
} from "@/lib/test/api-helpers";

describe("/api/v1/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns health envelope including persistence status", async () => {
    vi.mocked(checkPersistenceHealth).mockResolvedValue({
      database: "ok",
      redis: "ok",
      r2: "ok",
    });

    const { GET } = await import("../health/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    assertEnvelopeSuccess(json);
    expect(json.data.status).toBe("ok");
    expect(json.data.persistence).toEqual({
      database: "ok",
      redis: "ok",
      r2: "ok",
    });
  });

  it("returns 503 when persistence health fails", async () => {
    vi.mocked(checkPersistenceHealth).mockRejectedValue(
      new Error("database down"),
    );

    const { GET } = await import("../health/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    assertEnvelopeError(json);
  });
});
