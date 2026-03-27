import type { IdMap } from "../id-map";
import type { ConvexTask } from "../types";
import { intOpt, ts, tsOpt } from "./utils";

export interface PgTaskRow {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  deadline: number | null;
  deadlineSource: string | null;
  urgency: string | null;
  tags: string[];
  sourceType: string | null;
  sourceId: string | null;
  sourceContext: unknown;
  projectId: string | null;
  priority: number | null;
  position: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PgTaskEmbeddingRow {
  id: string;
  userId: string;
  taskKey: string;
  content: string;
  embedding: string;
  searchDocument: string | null;
  metadata: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface TaskTransformResult {
  task: PgTaskRow;
  embedding?: PgTaskEmbeddingRow;
}

export function transformTask(
  doc: ConvexTask,
  idMap: IdMap,
): TaskTransformResult {
  const taskId = idMap.get("tasks", doc._id);
  const task: PgTaskRow = {
    id: taskId,
    userId: idMap.get("users", doc.userId),
    title: doc.title,
    description: doc.description ?? null,
    status: doc.status,
    deadline: doc.deadline ?? null,
    deadlineSource: doc.deadlineSource ?? null,
    urgency: doc.urgency ?? null,
    tags: doc.tags ?? [],
    sourceType: doc.sourceType ?? null,
    sourceId: doc.sourceId ?? null,
    sourceContext: doc.sourceContext ?? null,
    projectId: idMap.getOptional("projects", doc.projectId) ?? null,
    priority: intOpt(doc.priority),
    position: intOpt(doc.position),
    completedAt: tsOpt(doc.completedAt),
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };

  const result: TaskTransformResult = { task };

  if (doc.embedding && doc.embedding.length > 0) {
    result.embedding = {
      id: idMap.get("taskEmbeddings", `${doc._id}_emb`),
      userId: idMap.get("users", doc.userId),
      taskKey: taskId,
      content: doc.title,
      embedding: `[${doc.embedding.join(",")}]`,
      searchDocument: null,
      metadata: null,
      createdAt: ts(doc.createdAt),
      updatedAt: ts(doc.updatedAt),
    };
  }

  return result;
}
