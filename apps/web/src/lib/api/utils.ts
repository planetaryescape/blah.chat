import type { NextRequest } from "next/server";
import type { z } from "zod";
import { BadRequestError } from "./errors";
import type { PaginatedResponse } from "./types";

export function parseRequestJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new BadRequestError("Invalid JSON body");
    throw error;
  }
}

export function parseListLimit(value: string | null | undefined): number {
  const parsed = value == null || value === "" ? 50 : Number(value);
  return Number.isFinite(parsed)
    ? Math.min(100, Math.max(1, Math.trunc(parsed)))
    : 50;
}

export async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const body = parseRequestJson(await req.text());
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
