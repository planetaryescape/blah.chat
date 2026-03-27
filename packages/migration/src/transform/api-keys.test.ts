import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type {
  ConvexCliApiKey,
  ConvexComposioConnection,
  ConvexUserApiKeys,
} from "../types";
import {
  transformCliApiKey,
  transformComposioConnection,
  transformUserApiKeys,
} from "./api-keys";

describe("transformCliApiKey", () => {
  it("maps all fields", () => {
    const idMap = new IdMap();
    const doc: ConvexCliApiKey = {
      _id: "cli1",
      _creationTime: 1700000000000,
      userId: "user1",
      keyHash: "sha256hash",
      keyPrefix: "blah_abc1...",
      name: "CLI Login - Jan 1",
      createdAt: 1700000000000,
    };

    const result = transformCliApiKey(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.keyHash).toBe("sha256hash");
    expect(result.keyPrefix).toBe("blah_abc1...");
    expect(result.name).toBe("CLI Login - Jan 1");
    expect(result.createdAt).toBe(1700000000000);
    expect(result.lastUsedAt).toBeNull();
    expect(result.revokedAt).toBeNull();
  });

  it("maps lastUsedAt and revokedAt when present", () => {
    const idMap = new IdMap();
    const doc: ConvexCliApiKey = {
      _id: "cli2",
      _creationTime: 1700000000000,
      userId: "user1",
      keyHash: "hash2",
      keyPrefix: "blah_xyz...",
      name: "Revoked Key",
      lastUsedAt: 1700000001000,
      revokedAt: 1700000002000,
      createdAt: 1700000000000,
    };
    const result = transformCliApiKey(doc, idMap);
    expect(result.lastUsedAt).toBe(1700000001000);
    expect(result.revokedAt).toBe(1700000002000);
  });
});

describe("transformUserApiKeys", () => {
  it("maps encrypted fields and preserves lastValidated as JSONB", () => {
    const idMap = new IdMap();
    const doc: ConvexUserApiKeys = {
      _id: "uak1",
      _creationTime: 1700000000000,
      userId: "user1",
      byokEnabled: true,
      encryptedVercelGatewayKey: "enc_vgk",
      encryptionIVs: "iv1:iv2:iv3:iv4",
      authTags: "tag1:tag2:tag3:tag4",
      lastValidated: { vercelGateway: 1700000000000 },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const result = transformUserApiKeys(doc, idMap);
    expect(result.byokEnabled).toBe(true);
    expect(result.encryptedVercelGatewayKey).toBe("enc_vgk");
    expect(result.encryptionIvs).toBe("iv1:iv2:iv3:iv4");
    expect(result.lastValidated).toEqual({ vercelGateway: 1700000000000 });
  });

  it("sets nullable encrypted fields to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexUserApiKeys = {
      _id: "uak2",
      _creationTime: 1700000000000,
      userId: "user1",
      byokEnabled: false,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const result = transformUserApiKeys(doc, idMap);
    expect(result.encryptedVercelGatewayKey).toBeNull();
    expect(result.encryptedOpenRouterKey).toBeNull();
    expect(result.encryptionIvs).toBeNull();
  });
});

describe("transformComposioConnection", () => {
  it("maps all fields with scopes default", () => {
    const idMap = new IdMap();
    const doc: ConvexComposioConnection = {
      _id: "comp1",
      _creationTime: 1700000000000,
      userId: "user1",
      composioConnectionId: "composio_123",
      integrationId: "github",
      integrationName: "GitHub",
      status: "active",
      connectedAt: 1700000000000,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const result = transformComposioConnection(doc, idMap);
    expect(result.scopes).toEqual([]);
    expect(result.status).toBe("active");
    expect(result.oauthState).toBeNull();
  });
});
