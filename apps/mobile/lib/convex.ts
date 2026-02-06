import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

// Portable client shim: keeps Convex-first ergonomics without backend package coupling.
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);
export const api: any = anyApi;

export type Id<_TableName extends string = string> = string;

export type Doc<TableName extends string = string> = {
  _id: Id<TableName>;
  _creationTime?: number;
  [key: string]: any;
};
