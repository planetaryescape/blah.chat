import type { ApiResponse } from "@/lib/api/types";
import { compact } from "./payload";

export type EntityListItem<T> = {
  sys: {
    entity: string;
    id?: string;
  };
  data: T;
};

export function formatEntity<T>(
  data: T,
  entity: string,
  id?: string,
): ApiResponse<T> {
  const hasTimestamps = data && typeof data === "object";

  // Compact data to remove null/undefined/empty fields (30-40% size reduction)
  const compactedData =
    data && typeof data === "object"
      ? (compact(data as Record<string, unknown>) as T)
      : data;

  return {
    status: "success",
    sys: {
      entity,
      ...(id && { id }),
      ...(hasTimestamps && {
        timestamps: {
          // @ts-ignore - Convex _creationTime field
          ...(data._creationTime && {
            // @ts-ignore
            created: new Date(data._creationTime).toISOString(),
          }),
          // @ts-ignore - updatedAt field
          ...(data.updatedAt && {
            // @ts-ignore
            updated: new Date(data.updatedAt).toISOString(),
          }),
          retrieved: new Date().toISOString(),
        },
      }),
    },
    data: compactedData,
  };
}

export function formatEntityList<T>(
  items: T[],
  entity: string,
): ApiResponse<EntityListItem<T>[]> {
  return {
    status: "success",
    sys: {
      entity: "list",
    },
    data: items.map((item) => {
      // Compact each item to reduce payload size
      const compactedItem =
        item && typeof item === "object"
          ? (compact(item as Record<string, unknown>) as T)
          : item;

      return {
        sys: {
          entity,
          // @ts-ignore - Convex _id field
          ...(item?._id && { id: item._id }),
        },
        data: compactedItem,
      };
    }),
  };
}

export function formatErrorEntity(
  error: Error | string | { message: string; code?: string; details?: unknown },
): ApiResponse<never> {
  return {
    status: "error",
    sys: {
      entity: "error",
    },
    error:
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : error,
  };
}
