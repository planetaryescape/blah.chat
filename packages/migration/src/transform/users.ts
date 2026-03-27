import type { IdMap } from "../id-map";
import type { ConvexUser } from "../types";
import { ts } from "./utils";

export interface PgUserRow {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export function transformUser(doc: ConvexUser, idMap: IdMap): PgUserRow {
  return {
    id: idMap.get("users", doc._id),
    clerkId: doc.clerkId,
    email: doc.email,
    name: doc.name,
    imageUrl: doc.imageUrl ?? null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
