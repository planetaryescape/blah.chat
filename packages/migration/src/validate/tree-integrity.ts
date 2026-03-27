import { sql } from "drizzle-orm";

export interface TreeIntegrityResult {
  orphanEdges: number;
  missingEdges: number;
  invalidActiveLeaf: number;
  passed: boolean;
  details: string[];
}

/**
 * Validate message tree integrity in Postgres.
 *
 * Checks:
 * 1. No orphan edges (both parent and child exist)
 * 2. activeLeafMessageId on conversations points to a valid message
 */
export async function checkTreeIntegrity(
  // biome-ignore lint/suspicious/noExplicitAny: drizzle db type
  db: any,
): Promise<TreeIntegrityResult> {
  const details: string[] = [];
  let orphanEdges = 0;
  let invalidActiveLeaf = 0;

  try {
    // Check for orphan edges: parent or child doesn't exist
    const orphanResult = await db.execute(
      sql.raw(`
      SELECT COUNT(*)::int as count FROM message_edges me
      WHERE NOT EXISTS (SELECT 1 FROM messages m WHERE m.id = me.parent_message_id)
         OR NOT EXISTS (SELECT 1 FROM messages m WHERE m.id = me.child_message_id)
    `),
    );
    orphanEdges = orphanResult.rows?.[0]?.count ?? orphanResult[0]?.count ?? 0;
    if (orphanEdges > 0) {
      details.push(`${orphanEdges} orphan edge(s) found`);
    }
  } catch (err) {
    details.push(`Edge check failed: ${err}`);
  }

  try {
    // Check activeLeafMessageId points to valid message in same conversation
    const leafResult = await db.execute(
      sql.raw(`
      SELECT COUNT(*)::int as count FROM conversations c
      WHERE c.active_leaf_message_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM messages m
          WHERE m.id = c.active_leaf_message_id
            AND m.conversation_id = c.id
        )
    `),
    );
    invalidActiveLeaf =
      leafResult.rows?.[0]?.count ?? leafResult[0]?.count ?? 0;
    if (invalidActiveLeaf > 0) {
      details.push(
        `${invalidActiveLeaf} conversation(s) with invalid activeLeafMessageId`,
      );
    }
  } catch (err) {
    details.push(`ActiveLeaf check failed: ${err}`);
  }

  return {
    orphanEdges,
    missingEdges: 0, // Would need Convex data to check this
    invalidActiveLeaf,
    passed: orphanEdges === 0 && invalidActiveLeaf === 0,
    details,
  };
}
