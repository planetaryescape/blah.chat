/**
 * Convex test setup for monorepo structure
 *
 * convex-test needs to know where the convex functions are located.
 * In a monorepo, we need to explicitly provide the module map.
 */
import { convexTest as originalConvexTest } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";

// Import all convex modules relative to this test file
// Must include _generated for convex-test to work
const modules = import.meta.glob(["../convex/**/*.ts", "!../__tests__/**"]);

/**
 * Wrapper around convexTest that provides the correct module map for monorepo
 */
export function convexTest<Schema extends GenericSchema>(
  schema?: SchemaDefinition<Schema, boolean>,
) {
  return originalConvexTest(schema, modules);
}
