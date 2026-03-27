import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexUser } from "../types";
import { transformUser } from "./users";

const makeUser = (overrides?: Partial<ConvexUser>): ConvexUser => ({
  _id: "j57user1",
  _creationTime: 1700000000000,
  clerkId: "clerk_abc",
  email: "alice@example.com",
  name: "Alice",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
});

describe("transformUser", () => {
  it("maps core fields and generates a PG ID", () => {
    const idMap = new IdMap();
    const result = transformUser(makeUser(), idMap);

    expect(result.id).toBe(idMap.get("users", "j57user1"));
    expect(result.clerkId).toBe("clerk_abc");
    expect(result.email).toBe("alice@example.com");
    expect(result.name).toBe("Alice");
    expect(result.createdAt).toBe(1700000000000);
    expect(result.updatedAt).toBe(1700000000000);
  });

  it("maps imageUrl when present", () => {
    const idMap = new IdMap();
    const result = transformUser(
      makeUser({ imageUrl: "https://img.com/a.png" }),
      idMap,
    );
    expect(result.imageUrl).toBe("https://img.com/a.png");
  });

  it("sets imageUrl to null when absent", () => {
    const idMap = new IdMap();
    const result = transformUser(makeUser({ imageUrl: undefined }), idMap);
    expect(result.imageUrl).toBeNull();
  });

  it("drops Convex-only fields (isAdmin, tier, dailyMessageCount)", () => {
    const idMap = new IdMap();
    const result = transformUser(
      makeUser({ isAdmin: true, tier: "tier1", dailyMessageCount: 50 }),
      idMap,
    );
    // Result should not have these fields
    expect(result).not.toHaveProperty("isAdmin");
    expect(result).not.toHaveProperty("tier");
    expect(result).not.toHaveProperty("dailyMessageCount");
  });

  it("produces the same PG ID for the same Convex ID", () => {
    const idMap = new IdMap();
    const r1 = transformUser(makeUser(), idMap);
    const r2 = transformUser(makeUser(), idMap);
    expect(r1.id).toBe(r2.id);
  });
});
