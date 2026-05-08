/**
 * @vitest-environment node
 */
import {
  conversations,
  createConversationRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const getUserMock = vi.fn();
const clerkClientMock = vi.fn(() =>
  Promise.resolve({ users: { getUser: getUserMock } }),
);
const redirectMock = vi.fn((url: string) => {
  // mimic Next.js: redirect throws to abort the rest of the render.
  const err = new Error(`NEXT_REDIRECT:${url}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;${url}`;
  throw err;
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
  clerkClient: clerkClientMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/server", () => ({
  after: (cb: () => void | Promise<void>) => {
    void cb();
  },
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

let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

const SEEDED_CLERK_USER = {
  id: "clerk_app_page",
  primaryEmailAddress: { emailAddress: "page@example.com" },
  fullName: "Page User",
  firstName: "Page",
  lastName: "User",
  imageUrl: "https://example.com/page.png",
};

async function callPage() {
  const mod = await import("../page");
  // redirect throws — capture and discard so the test can inspect redirectMock.
  try {
    await mod.default();
  } catch (err) {
    if (
      err instanceof Error &&
      typeof (err as Error & { digest?: string }).digest === "string" &&
      (err as Error & { digest?: string }).digest!.startsWith("NEXT_REDIRECT")
    ) {
      return;
    }
    throw err;
  }
}

describe("AppPage server component dispatcher", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    currentUserMock.mockResolvedValue(null);
    getUserMock.mockResolvedValue(SEEDED_CLERK_USER);
  });

  it("redirects unauthenticated requests to /sign-in", async () => {
    authMock.mockResolvedValue({ userId: null, sessionClaims: null });

    await callPage();

    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("redirects to a newly created conversation when user is fresh", async () => {
    authMock.mockResolvedValue({
      userId: "clerk_app_page",
      sessionClaims: null,
    });

    await callPage();

    const target = redirectMock.mock.calls.at(-1)?.[0] as string;
    expect(target).toMatch(/^\/chat\//);
    const newId = target.replace("/chat/", "");

    const rows = await db.select({ id: conversations.id }).from(conversations);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(newId);
  });

  it("redirects when a fresh user's Clerk lookup fails but session claims exist", async () => {
    getUserMock.mockRejectedValue(
      new Error("Clerk API temporarily unavailable"),
    );
    authMock.mockResolvedValue({
      userId: "clerk_app_page",
      sessionClaims: {
        email: "page@example.com",
        name: "Page User",
        picture: "https://example.com/page.png",
      },
    });

    await callPage();

    const target = redirectMock.mock.calls.at(-1)?.[0] as string;
    expect(target).toMatch(/^\/chat\//);

    const rows = await db.select({ id: conversations.id }).from(conversations);
    expect(rows).toHaveLength(1);
  });

  it("succeeds when Clerk currentUser would have returned null", async () => {
    // Pre-seed user (simulates webhook fired). currentUserMock keeps returning
    // null per beforeEach — this is the regression scenario.
    const repo = createUserRepository(db);
    await repo.upsertFromClerk({
      clerkId: "clerk_app_page",
      email: "page@example.com",
      name: "Page User",
    });

    authMock.mockResolvedValue({
      userId: "clerk_app_page",
      sessionClaims: null,
    });

    await callPage();

    expect(redirectMock).toHaveBeenCalled();
    const target = redirectMock.mock.calls.at(-1)?.[0] as string;
    expect(target).toMatch(/^\/chat\//);
  });

  it("reuses an empty conversation when one exists", async () => {
    const repo = createUserRepository(db);
    const user = await repo.upsertFromClerk({
      clerkId: "clerk_app_page",
      email: "page@example.com",
      name: "Page User",
    });
    const convRepo = createConversationRepository(db);
    const empty = await convRepo.create({
      userId: user.id,
      title: "Existing Empty",
      model: "openai/gpt-4o",
    });

    authMock.mockResolvedValue({
      userId: "clerk_app_page",
      sessionClaims: null,
    });

    await callPage();

    expect(redirectMock).toHaveBeenCalledWith(`/chat/${empty.id}`);
    const rowCount = await db
      .select({ id: conversations.id })
      .from(conversations);
    expect(rowCount).toHaveLength(1);
  });

  it("passes sessionClaims through so JWT-claim drift is observable", async () => {
    const repo = createUserRepository(db);
    await repo.upsertFromClerk({
      clerkId: "clerk_app_page",
      email: "old@example.com",
      name: "Old Name",
    });

    authMock.mockResolvedValue({
      userId: "clerk_app_page",
      sessionClaims: {
        email: "new@example.com",
        name: "New Name",
        imageUrl: "https://example.com/new.png",
      },
    });

    await callPage();

    // After fires synchronously via our mock, so DB is already updated.
    const updated = await db.query.users.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.clerkId, "clerk_app_page"),
    });
    expect(updated?.email).toBe("new@example.com");
    expect(updated?.name).toBe("New Name");
  });
});
