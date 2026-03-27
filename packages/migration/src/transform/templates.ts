import type { IdMap } from "../id-map";
import type { ConvexTemplate } from "../types";
import { int, ts } from "./utils";

export interface PgTemplateRow {
  id: string;
  userId: string | null;
  name: string;
  prompt: string;
  description: string | null;
  category: string;
  isBuiltIn: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export function transformTemplate(
  doc: ConvexTemplate,
  idMap: IdMap,
): PgTemplateRow {
  return {
    id: idMap.get("templates", doc._id),
    userId: idMap.getIfMapped("users", doc.userId) ?? null,
    name: doc.name,
    prompt: doc.prompt,
    description: doc.description ?? null,
    category: doc.category,
    isBuiltIn: doc.isBuiltIn,
    isPublic: doc.isPublic,
    usageCount: int(doc.usageCount),
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
