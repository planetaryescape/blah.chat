/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  usageRecords as usageRecordsTable,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const generateTextMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
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

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: generateTextMock,
  };
});

vi.mock("@blah-chat/ai/registry", () => ({
  getModel: vi.fn(() => ({})),
}));

vi.mock("@blah-chat/ai/gateway", () => ({
  getGatewayOptions: vi.fn(() => ({})),
}));

describe("summarize route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_summarize",
      email: "summarize@example.com",
      name: "Summarize Tester",
    });
    authMock.mockResolvedValue({
      userId: "clerk_summarize",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_summarize",
      primaryEmailAddress: { emailAddress: "summarize@example.com" },
      fullName: "Summarize Tester",
      firstName: "Summarize",
      lastName: "Tester",
      imageUrl: null,
    });
    generateTextMock.mockResolvedValue({
      text: "  The team agreed to ship next sprint.  ",
      usage: { inputTokens: 120, outputTokens: 30 },
    });
  });

  it("summarizes text, returns the envelope shape, and logs usage", async () => {
    const { POST } = await import("../actions/summarize/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/summarize", {
        method: "POST",
        body: {
          text: "long meeting transcript about shipping next sprint",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { summary: string; modelId: string };
    };
    expect(json.status).toBe("success");
    const data = unwrapData<{ summary: string; modelId: string }>(json);

    // SummarizePopover reads `data.summary` from the envelope.
    expect(data.summary).toBe("The team agreed to ship next sprint.");
    expect(data.modelId).toBeTruthy();
    expect(generateTextMock).toHaveBeenCalledTimes(1);

    const usage = await db
      .select()
      .from(usageRecordsTable)
      .where(eq(usageRecordsTable.feature, "smart_assistant"));
    expect(usage).toHaveLength(1);
    expect(usage[0]?.inputTokens).toBe(120);
    expect(usage[0]?.outputTokens).toBe(30);
  });

  it("rejects an empty body", async () => {
    const { POST } = await import("../actions/summarize/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/summarize", {
        method: "POST",
        body: {},
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("rejects text above the 64k character bound", async () => {
    const { POST } = await import("../actions/summarize/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/summarize", {
        method: "POST",
        body: { text: "a".repeat(64_001) },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});
