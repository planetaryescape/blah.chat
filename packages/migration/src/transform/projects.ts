import type { IdMap } from "../id-map";
import type { ConvexProject } from "../types";
import { ts } from "./utils";

export interface PgProjectRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  isTemplate: boolean;
  createdFrom: string | null;
  createdAt: number;
  updatedAt: number;
}

export function transformProject(
  doc: ConvexProject,
  idMap: IdMap,
): PgProjectRow {
  return {
    id: idMap.get("projects", doc._id),
    userId: idMap.get("users", doc.userId),
    name: doc.name,
    description: doc.description ?? null,
    systemPrompt: doc.systemPrompt ?? null,
    isTemplate: doc.isTemplate ?? false,
    createdFrom: idMap.getOptional("projects", doc.createdFrom) ?? null,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
