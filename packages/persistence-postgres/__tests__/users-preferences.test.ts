import { eq, sql } from "drizzle-orm";
import { createConversationRepository } from "../src/repositories/conversations";
import { createPreferenceRepository } from "../src/repositories/preferences";
import { createUserRepository } from "../src/repositories/users";
import { conversations, users } from "../src/schema";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("user + preference repositories", () => {
  const listUsersByEmail = async (
    db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
    email: string,
  ) =>
    db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);

  test("finds and deletes users by clerk id", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);

    await users.upsertFromClerk({
      clerkId: "user_delete",
      email: "delete@example.com",
      name: "Delete Me",
    });

    const found = await users.findByClerkId("user_delete");
    const deleted = await users.deleteByClerkId("user_delete");
    const afterDelete = await users.findByClerkId("user_delete");

    expect(found?.clerkId).toBe("user_delete");
    expect(deleted?.clerkId).toBe("user_delete");
    expect(afterDelete).toBeUndefined();
  });

  test("stores and reads preferences by clerk id", async () => {
    const db = await createTestPersistenceDb();
    const users = createUserRepository(db);
    const preferences = createPreferenceRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "user_prefs",
      email: "prefs@example.com",
      name: "Prefs User",
    });

    await preferences.setForUser(user.id, "showNotes", true);
    await preferences.setForUser(user.id, "theme", "dark");

    const single = await preferences.getForClerkId("user_prefs", "showNotes");
    const all = await preferences.getAllForClerkId("user_prefs");

    expect(single).toBe(true);
    expect(all).toEqual({
      showNotes: true,
      theme: "dark",
    });
  });

  test("reuses the existing email row when the Clerk id changes", async () => {
    const db = await createTestPersistenceDb();
    const usersRepo = createUserRepository(db);

    const original = await usersRepo.upsertFromClerk({
      clerkId: "user_old",
      email: " User@Example.com ",
      name: "Original User",
    });

    const reconciled = await usersRepo.upsertFromClerk({
      clerkId: "user_new",
      email: "user@example.com",
      name: "Updated User",
    });

    const rows = await listUsersByEmail(db, "user@example.com");

    expect(reconciled.id).toBe(original.id);
    expect(reconciled.clerkId).toBe("user_new");
    expect(reconciled.email).toBe("user@example.com");
    expect(reconciled.name).toBe("Updated User");
    expect(await usersRepo.findByClerkId("user_old")).toBeUndefined();
    expect(await usersRepo.findByClerkId("user_new")).toMatchObject({
      id: original.id,
      email: "user@example.com",
    });
    expect(rows).toHaveLength(1);
  });

  test("reconciles an empty duplicate row onto the data-owning user", async () => {
    const db = await createTestPersistenceDb();
    const usersRepo = createUserRepository(db);
    const conversationsRepo = createConversationRepository(db);

    const canonical = await usersRepo.upsertFromClerk({
      clerkId: "user_canonical",
      email: "history@example.com",
      name: "History User",
    });

    const conversation = await conversationsRepo.create({
      userId: canonical.id,
      title: "Existing History",
      model: "gpt-5",
    });

    await db.insert(users).values({
      clerkId: "user_current",
      email: "history@example.com",
      name: "Duplicate User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const reconciled = await usersRepo.upsertFromClerk({
      clerkId: "user_current",
      email: "history@example.com",
      name: "Current User",
    });

    const rows = await listUsersByEmail(db, "history@example.com");
    const storedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });

    expect(reconciled.id).toBe(canonical.id);
    expect(reconciled.clerkId).toBe("user_current");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: canonical.id,
      clerkId: "user_current",
      name: "Current User",
    });
    expect(await usersRepo.findByClerkId("user_canonical")).toBeUndefined();
    expect(storedConversation?.userId).toBe(canonical.id);
  });

  test("fails closed when duplicate same-email rows both own data", async () => {
    const db = await createTestPersistenceDb();
    const usersRepo = createUserRepository(db);
    const preferences = createPreferenceRepository(db);

    const canonical = await usersRepo.upsertFromClerk({
      clerkId: "user_canonical",
      email: "ambiguous@example.com",
      name: "Canonical User",
    });

    await preferences.setForUser(canonical.id, "theme", "dark");

    const [duplicate] = await db
      .insert(users)
      .values({
        clerkId: "user_current",
        email: "ambiguous@example.com",
        name: "Current User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();

    await preferences.setForUser(duplicate.id, "theme", "light");

    await expect(
      usersRepo.upsertFromClerk({
        clerkId: "user_current",
        email: "ambiguous@example.com",
        name: "Still Ambiguous",
      }),
    ).rejects.toThrow("Ambiguous user reconciliation");

    const rows = await listUsersByEmail(db, "ambiguous@example.com");

    expect(rows).toHaveLength(2);
    expect(await usersRepo.findByClerkId("user_canonical")).toMatchObject({
      id: canonical.id,
    });
    expect(await usersRepo.findByClerkId("user_current")).toMatchObject({
      id: duplicate.id,
    });
  });
});
