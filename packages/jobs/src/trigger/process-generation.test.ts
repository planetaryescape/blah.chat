import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processGeneration } from "./process-generation";

const ORIGINAL_BASE_URL = process.env.INTERNAL_TASK_BASE_URL;
const ORIGINAL_SECRET = process.env.INTERNAL_TASK_SECRET;

beforeEach(() => {
  process.env.INTERNAL_TASK_BASE_URL = "https://example.test";
  process.env.INTERNAL_TASK_SECRET = "shared-secret-12345678";
});

afterEach(() => {
  if (ORIGINAL_BASE_URL === undefined)
    delete process.env.INTERNAL_TASK_BASE_URL;
  else process.env.INTERNAL_TASK_BASE_URL = ORIGINAL_BASE_URL;
  if (ORIGINAL_SECRET === undefined) delete process.env.INTERNAL_TASK_SECRET;
  else process.env.INTERNAL_TASK_SECRET = ORIGINAL_SECRET;
});

describe("processGeneration", () => {
  it("POSTs to the internal process endpoint with bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "generationProcess", id: "req-1" },
          data: { requestId: "req-1", status: "complete" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await processGeneration(
      { requestId: "req-1" },
      { fetch: fetchMock },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://example.test/api/internal/generations/req-1/process",
    );
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers?.Authorization).toBe("Bearer shared-secret-12345678");

    expect(result).toMatchObject({
      data: { requestId: "req-1", status: "complete" },
    });
  });

  it("URL-encodes the request id when it contains unsafe characters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          sys: { entity: "generationProcess" },
          data: { requestId: "req/with spaces", status: "complete" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await processGeneration(
      { requestId: "req/with spaces" },
      { fetch: fetchMock },
    );

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://example.test/api/internal/generations/req%2Fwith%20spaces/process",
    );
  });

  it("throws when the endpoint returns a non-OK status", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response("server is unhappy", { status: 500 }),
      );

    await expect(
      processGeneration({ requestId: "req-2" }, { fetch: fetchMock }),
    ).rejects.toThrowError(/HTTP 500.*server is unhappy/s);
  });

  it("throws when INTERNAL_TASK_BASE_URL is not configured", async () => {
    delete process.env.INTERNAL_TASK_BASE_URL;
    const fetchMock = vi.fn();

    await expect(
      processGeneration({ requestId: "req-3" }, { fetch: fetchMock }),
    ).rejects.toThrowError(/INTERNAL_TASK_BASE_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when INTERNAL_TASK_SECRET is not configured", async () => {
    delete process.env.INTERNAL_TASK_SECRET;
    const fetchMock = vi.fn();

    await expect(
      processGeneration({ requestId: "req-4" }, { fetch: fetchMock }),
    ).rejects.toThrowError(/INTERNAL_TASK_SECRET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
