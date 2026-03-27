/**
 * Standalone type aliases for entity types.
 * These were originally Convex document types but are now simple
 * structural types used across mobile components.
 */

export type Id<T extends string = string> = string & { __tableName?: T };

export type Doc<T extends string = string> = {
  _id: Id<T>;
  _creationTime?: number;
  [key: string]: any;
};
