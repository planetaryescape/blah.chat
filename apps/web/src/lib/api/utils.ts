import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { PaginatedResponse } from "./types";

export async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function getPaginationParams(req: NextRequest): {
  page: number;
  pageSize: number;
} {
  const url = new URL(req.url);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Number.parseInt(
    url.searchParams.get("pageSize") || "50",
    10,
  );

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  };
}

export function getQueryParam(
  req: NextRequest,
  key: string,
  defaultValue?: string,
): string | undefined {
  const url = new URL(req.url);
  return url.searchParams.get(key) || defaultValue;
}

export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  };
}
