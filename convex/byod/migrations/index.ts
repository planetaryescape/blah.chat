/**
 * BYOD Migration Registry
 *
 * All migrations must be registered here in order.
 * Migrations run sequentially and update schema version on success.
 */

import { migration001 } from "./001_initial";

/**
 * Migration context provided to each migration
 */
export interface MigrationContext {
	/** URL of user's BYOD deployment */
	deploymentUrl: string;
	/** Deploy key for admin access */
	deployKey: string;
	/** User's Convex ID */
	userId: string;
	/** User's Clerk ID */
	clerkId: string;
}

/**
 * Migration definition
 */
export interface Migration {
	/** Unique migration ID (e.g., "001_initial") */
	id: string;
	/** Schema version after this migration */
	version: number;
	/** Human-readable name */
	name: string;
	/** Description of what this migration does */
	description: string;
	/** Migration logic - called with decrypted credentials */
	up: (ctx: MigrationContext) => Promise<void>;
	/** Rollback logic (optional) */
	down?: (ctx: MigrationContext) => Promise<void>;
}

/**
 * Registry of all migrations in order
 * Add new migrations to the end of this array
 */
export const MIGRATIONS: Migration[] = [
	migration001,
	// Add future migrations here in order:
	// migration002,
	// migration003,
];

/**
 * Get migrations after a specific version
 */
export function getMigrationsAfter(version: number): Migration[] {
	return MIGRATIONS.filter((m) => m.version > version);
}

/**
 * Get a specific migration by ID
 */
export function getMigration(id: string): Migration | undefined {
	return MIGRATIONS.find((m) => m.id === id);
}

/**
 * Get the latest migration version
 */
export function getLatestVersion(): number {
	if (MIGRATIONS.length === 0) return 0;
	return MIGRATIONS[MIGRATIONS.length - 1].version;
}

/**
 * Check if migrations are pending for a given version
 */
export function hasPendingMigrations(currentVersion: number): boolean {
	return getMigrationsAfter(currentVersion).length > 0;
}
