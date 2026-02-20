import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);
export const api = anyApi;

export type Id<T extends string = string> = string & { __tableName?: T };

export type Doc<T extends string = string> = {
  _id: Id<T>;
  _creationTime?: number;
  [key: string]: any;
};
