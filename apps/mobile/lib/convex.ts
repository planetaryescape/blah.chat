import type { api as backendApi } from "@blah-chat/backend/convex/_generated/api";
import type {
  Doc as BackendDoc,
  Id as BackendId,
  TableNames,
} from "@blah-chat/backend/convex/_generated/dataModel";
import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);
export const api = anyApi as unknown as typeof backendApi;

export type Id<T extends string = string> = T extends TableNames
  ? BackendId<T>
  : string;

export type Doc<T extends string = string> = T extends TableNames
  ? BackendDoc<T>
  : { _id: string; _creationTime?: number; [key: string]: any };
