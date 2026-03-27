/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListIntegrationEvents = vi.fn();

vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: {
    listIntegrationEvents: mockListIntegrationEvents,
  },
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "test-user-id",
      }),
}));

vi.mock("@/lib/api/middleware/errors", () => ({
  withErrorHandling:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, context),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

import { createMockRequest } from "@/lib/test/api-helpers";

describe("GET /api/v1/conversations/:id/integration-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the integration event list", async () => {
    mockListIntegrationEvents.mockResolvedValue([
      {
        status: "success",
        sys: { entity: "conversationIntegrationEvent", id: "evt_1" },
        data: {
          _id: "evt_1",
          conversationId: "conv_1",
          integrationId: "github",
          integrationName: "GitHub",
          action: "enabled",
          source: "composer",
          createdAt: 1,
          _creationTime: 1,
        },
      },
    ]);

    const { GET } = await import(
      "../conversations/[id]/integration-events/route"
    );
    const response = await GET(
      createMockRequest("/api/v1/conversations/conv_1/integration-events"),
      { params: Promise.resolve({ id: "conv_1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(mockListIntegrationEvents).toHaveBeenCalledWith(
      "test-user-id",
      "conv_1",
    );
  });
});
