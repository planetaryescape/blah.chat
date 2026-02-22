import { anyApi } from "convex/server";

export const api = anyApi;

export type Id<T extends string = string> = string & { __tableName?: T };

export type Doc<T extends string = string> = {
  _id: Id<T>;
  _creationTime?: number;
  [key: string]: any;
};
