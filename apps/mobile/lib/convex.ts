import type { api as backendApi } from "@blah-chat/backend/convex/_generated/api";
import type {
  Doc as BackendDoc,
  Id as BackendId,
  TableNames,
} from "@blah-chat/backend/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

// Portable client shim: keeps Convex-first ergonomics without backend package coupling.
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);

// Type-only cast: gives full type safety on api paths without bundling the backend
export const api = anyApi as unknown as typeof backendApi;

// Re-export branded types from backend
export type Id<T extends TableNames> = BackendId<T>;
export type Doc<T extends TableNames> = BackendDoc<T>;
