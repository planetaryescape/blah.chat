/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  feedbackEntries,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const triggerTaskMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createTriggerClient: vi.fn(() => ({
      ping: vi.fn(),
      triggerTask: triggerTaskMock,
      retrieveRun: vi.fn(),
    })),
    parsePersistenceEnv: vi.fn(() => ({
      databaseUrl: "postgres://user:pass@host/db",
      redis: {
        restUrl: "https://example.upstash.io",
        restToken: "token",
      },
      r2: {
        accountId: "account123",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucket: "blah-chat-prod",
        endpoint: "https://account123.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: {
        secretKey: "tr_dev_123",
        apiUrl: "https://api.trigger.dev",
      },
    })),
  };
});

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

describe("feedback auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    triggerTaskMock.mockResolvedValue({ id: "run_feedback_triage" });

    authMock.mockResolvedValue({
      userId: "clerk_feedback",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_feedback",
      primaryEmailAddress: { emailAddress: "feedback@example.com" },
      fullName: "Feedback User",
      firstName: "Feedback",
      lastName: "User",
      imageUrl: "https://example.com/feedback.png",
      publicMetadata: {},
    });
  });

  it("creates feedback in Postgres and enqueues auto triage through the v1 route", async () => {
    const { POST } = await import("../feedback/route");
    const response = await POST(
      createMockRequest("/api/v1/feedback", {
        method: "POST",
        body: {
          feedbackType: "bug",
          description: "The stream stalled after refresh.",
          page: "/chat/conv_1",
          whatTheyDid: "Reloaded while streaming",
          whatTheySaw: "Spinner never finished",
          whatTheyExpected: "Stream should reconnect",
          screenshotKey: "users/user_1/drafts/feedback.png",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(201);
    const created = unwrapData<{
      _id: string;
      status: string;
      priority: string;
    }>((await response.json()) as any);
    expect(created.status).toBe("new");
    expect(created.priority).toBe("none");

    const stored = await db.query.feedbackEntries.findFirst({
      where: eq(feedbackEntries.id, created._id),
    });
    expect(stored).toMatchObject({
      description: "The stream stalled after refresh.",
      screenshotKey: "users/user_1/drafts/feedback.png",
      feedbackType: "bug",
    });
    expect(triggerTaskMock).toHaveBeenCalledWith("auto-triage-feedback", {
      feedbackId: created._id,
    });
  });

  it("lists and updates Postgres feedback through the admin routes", async () => {
    const users = createUserRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_feedback",
      email: "feedback@example.com",
      name: "Feedback User",
      imageUrl: "https://example.com/feedback.png",
    });

    const [feedback] = await db
      .insert(feedbackEntries)
      .values({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        page: "/chat/conv_1",
        feedbackType: "feature",
        description: "Need a better resume indicator.",
        status: "submitted",
        priority: "none",
        aiTriage: {
          suggestedPriority: "high",
          suggestedTags: ["streaming", "resume"],
          triageNotes: "Summary: reconnect gap",
          createdAt: 100,
        },
        createdAt: 100,
        updatedAt: 100,
      })
      .returning();

    currentUserMock.mockResolvedValue({
      id: "clerk_feedback",
      primaryEmailAddress: { emailAddress: "feedback@example.com" },
      fullName: "Feedback User",
      firstName: "Feedback",
      lastName: "User",
      imageUrl: "https://example.com/feedback.png",
      publicMetadata: { isAdmin: true },
    });

    const listRoute = await import("../admin/feedback/route");
    const listResponse = await listRoute.GET(
      createMockRequest("/api/v1/admin/feedback?type=feature", {
        method: "GET",
      }),
      { params: Promise.resolve({}) },
    );
    expect(listResponse.status).toBe(200);
    const listed = unwrapData<Array<{ data: { _id: string } }>>(
      (await listResponse.json()) as any,
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.data._id).toBe(feedback!.id);

    const getRoute = await import("../admin/feedback/[id]/route");
    const getResponse = await getRoute.GET(
      createMockRequest(`/api/v1/admin/feedback/${feedback!.id}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: feedback!.id }) },
    );
    expect(getResponse.status).toBe(200);
    expect(
      unwrapData<{ _id: string; aiTriage?: { suggestedPriority: string } }>(
        (await getResponse.json()) as any,
      ),
    ).toMatchObject({
      _id: feedback!.id,
      aiTriage: { suggestedPriority: "high" },
    });

    const priorityRoute = await import("../admin/feedback/[id]/priority/route");
    const priorityResponse = await priorityRoute.PATCH(
      createMockRequest(`/api/v1/admin/feedback/${feedback!.id}/priority`, {
        method: "PATCH",
        body: { priority: "medium" },
      }),
      { params: Promise.resolve({ id: feedback!.id }) },
    );
    expect(priorityResponse.status).toBe(200);

    const acceptRoute = await import(
      "../admin/feedback/[id]/accept-triage/route"
    );
    const acceptResponse = await acceptRoute.POST(
      createMockRequest(
        `/api/v1/admin/feedback/${feedback!.id}/accept-triage`,
        {
          method: "POST",
          body: { acceptPriority: true, acceptTags: true },
        },
      ),
      { params: Promise.resolve({ id: feedback!.id }) },
    );
    expect(acceptResponse.status).toBe(200);

    const updated = await db.query.feedbackEntries.findFirst({
      where: eq(feedbackEntries.id, feedback!.id),
    });
    expect(updated).toMatchObject({
      priority: "high",
      tags: ["streaming", "resume"],
    });
  });
});
