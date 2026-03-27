import { beforeEach, describe, expect, it } from "vitest";
import { IdMap } from "./id-map";

describe("IdMap", () => {
  let idMap: IdMap;

  beforeEach(() => {
    idMap = new IdMap();
  });

  it("generates a non-empty string ID for an unseen Convex ID", () => {
    const pgId = idMap.get("users", "j57abc123");
    expect(typeof pgId).toBe("string");
    expect(pgId.length).toBeGreaterThan(0);
  });

  it("returns the same ID for the same Convex ID (idempotent)", () => {
    const first = idMap.get("users", "j57abc123");
    const second = idMap.get("users", "j57abc123");
    expect(first).toBe(second);
  });

  it("returns different IDs for different Convex IDs", () => {
    const id1 = idMap.get("users", "j57abc123");
    const id2 = idMap.get("users", "j57def456");
    expect(id1).not.toBe(id2);
  });

  it("uses separate namespaces per entity type", () => {
    // Same Convex ID in different namespaces should produce different PG IDs
    const userId = idMap.get("users", "j57abc123");
    const convId = idMap.get("conversations", "j57abc123");
    expect(userId).not.toBe(convId);
  });

  it("supports reverse lookup (PG ID -> Convex ID)", () => {
    const pgId = idMap.get("users", "j57abc123");
    const convexId = idMap.reverse("users", pgId);
    expect(convexId).toBe("j57abc123");
  });

  it("returns undefined for unknown reverse lookup", () => {
    expect(idMap.reverse("users", "nonexistent")).toBeUndefined();
  });

  it("serializes to JSON and deserializes back", () => {
    idMap.get("users", "user1");
    idMap.get("users", "user2");
    idMap.get("conversations", "conv1");

    const json = idMap.toJSON();
    const restored = IdMap.fromJSON(json);

    expect(restored.get("users", "user1")).toBe(idMap.get("users", "user1"));
    expect(restored.get("users", "user2")).toBe(idMap.get("users", "user2"));
    expect(restored.get("conversations", "conv1")).toBe(
      idMap.get("conversations", "conv1"),
    );
  });

  it("tracks the count of mapped IDs per namespace", () => {
    idMap.get("users", "u1");
    idMap.get("users", "u2");
    idMap.get("conversations", "c1");

    expect(idMap.count("users")).toBe(2);
    expect(idMap.count("conversations")).toBe(1);
    expect(idMap.count("messages")).toBe(0);
  });

  it("allows pre-seeding a known mapping", () => {
    idMap.set("users", "convex-id-1", "known-pg-id-1");
    expect(idMap.get("users", "convex-id-1")).toBe("known-pg-id-1");
    expect(idMap.reverse("users", "known-pg-id-1")).toBe("convex-id-1");
  });

  it("does not overwrite existing mapping when pre-seeding", () => {
    const original = idMap.get("users", "convex-id-1");
    idMap.set("users", "convex-id-1", "different-pg-id");
    // Should keep original
    expect(idMap.get("users", "convex-id-1")).toBe(original);
  });

  it("handles optional convex IDs by returning undefined", () => {
    expect(idMap.getOptional("users", undefined)).toBeUndefined();
    expect(
      idMap.getOptional("users", null as unknown as undefined),
    ).toBeUndefined();
  });

  it("maps optional convex IDs when present", () => {
    const pgId = idMap.getOptional("users", "user1");
    expect(typeof pgId).toBe("string");
    expect(pgId!.length).toBeGreaterThan(0);
    expect(idMap.get("users", "user1")).toBe(pgId);
  });
});
