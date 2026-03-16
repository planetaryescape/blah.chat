import { createPreferenceRepository } from "../src/repositories/preferences";
import { createUserRepository } from "../src/repositories/users";
import { createTestPersistenceDb } from "../src/testing/pglite";

describe("user + preference repositories", () => {
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
});
