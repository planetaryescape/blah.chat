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
const generateObjectMock = vi.fn();
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
    generateObject: generateObjectMock,
  };
});

vi.mock("@blah-chat/ai/registry", () => ({
  getModel: vi.fn(() => ({})),
}));

vi.mock("@blah-chat/ai/gateway", () => ({
  getGatewayOptions: vi.fn(() => ({})),
}));

describe("extract-meeting route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_meeting",
      email: "meeting@example.com",
      name: "Meeting Tester",
    });
    authMock.mockResolvedValue({
      userId: "clerk_meeting",
      getToken: vi.fn(async () => null),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_meeting",
      primaryEmailAddress: { emailAddress: "meeting@example.com" },
      fullName: "Meeting Tester",
      firstName: "Meeting",
      lastName: "Tester",
      imageUrl: null,
    });
    generateObjectMock.mockResolvedValue({
      object: {
        tasks: [
          {
            title: "Send recap",
            urgency: "medium",
            confidence: 0.9,
          },
        ],
        notes: [
          {
            title: "Meeting Summary - Q3 planning",
            content: "## Decisions\n- Ship next sprint",
            category: "discussion",
            confidence: 0.85,
          },
        ],
      },
      usage: { inputTokens: 200, outputTokens: 80 },
    });
  });

  it("extracts tasks and notes from a transcript and logs usage", async () => {
    const { POST } = await import("../actions/extract-meeting/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/extract-meeting", {
        method: "POST",
        body: {
          transcript: "alice: ship next sprint. bob: send recap.",
          meetingDate: new Date().toISOString(),
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: {
        tasks: Array<{ title: string }>;
        notes: Array<{ title: string }>;
      };
    };
    const data = unwrapData<{
      tasks: Array<{ title: string }>;
      notes: Array<{ title: string }>;
    }>(json);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]!.title).toBe("Send recap");
    expect(data.notes).toHaveLength(1);
    expect(generateObjectMock).toHaveBeenCalledTimes(1);

    const usage = await db
      .select()
      .from(usageRecordsTable)
      .where(eq(usageRecordsTable.feature, "smart_assistant"));
    expect(usage).toHaveLength(1);
    expect(usage[0]!.inputTokens).toBe(200);
    expect(usage[0]!.outputTokens).toBe(80);
  });
});
