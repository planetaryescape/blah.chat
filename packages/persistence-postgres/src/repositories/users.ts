import { eq, sql } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { users } from "../schema";

export interface ClerkIdentityInput {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
}

type UserRow = typeof users.$inferSelect;

type UserReference = {
  tableName: string;
  columnName: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function createUserRepository(db: PersistenceDb) {
  return {
    async findByClerkId(clerkId: string) {
      return db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
      });
    },

    async upsertFromClerk(input: ClerkIdentityInput) {
      const timestamp = Date.now();
      const normalizedEmail = normalizeEmail(input.email);

      return db.transaction(async (tx) => {
        const selectUsersByNormalizedEmail = () =>
          tx
            .select()
            .from(users)
            .where(sql`lower(${users.email}) = ${normalizedEmail}`);

        const loadUserReferences = async () => {
          const result = await tx.execute(sql<UserReference>`
            select distinct
              tc.table_name as "tableName",
              kcu.column_name as "columnName"
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on tc.constraint_name = kcu.constraint_name
             and tc.table_schema = kcu.table_schema
            join information_schema.constraint_column_usage ccu
              on ccu.constraint_name = tc.constraint_name
             and ccu.table_schema = tc.table_schema
            where tc.constraint_type = 'FOREIGN KEY'
              and tc.table_schema = 'public'
              and ccu.table_name = 'users'
              and ccu.column_name = 'id'
            order by tc.table_name, kcu.column_name
          `);

          return result.rows.map((row) => ({
            tableName: String(row.tableName),
            columnName: String(row.columnName),
          }));
        };

        const hasOwnedData = async (refs: UserReference[], userId: string) => {
          for (const ref of refs) {
            const result = await tx.execute(sql<{ exists: boolean }>`
              select exists(
                select 1
                from ${sql.raw(quoteIdentifier(ref.tableName))}
                where ${sql.raw(quoteIdentifier(ref.columnName))} = ${userId}
              ) as "exists"
            `);

            if (result.rows[0]?.exists) {
              return true;
            }
          }

          return false;
        };

        const updateUser = async (userId: string, clerkId: string) => {
          const [row] = await tx
            .update(users)
            .set({
              clerkId,
              email: normalizedEmail,
              name: input.name,
              imageUrl: input.imageUrl,
              updatedAt: timestamp,
            })
            .where(eq(users.id, userId))
            .returning();

          if (!row) {
            throw new Error(`Failed to update user id=${userId}`);
          }

          return row;
        };

        const insertUser = async () => {
          const [row] = await tx
            .insert(users)
            .values({
              clerkId: input.clerkId,
              email: normalizedEmail,
              name: input.name,
              imageUrl: input.imageUrl,
              createdAt: timestamp,
              updatedAt: timestamp,
            })
            .returning();

          if (!row) {
            throw new Error(
              `Failed to create user for clerkId=${input.clerkId}`,
            );
          }

          return row;
        };

        const existingByClerkId = await tx.query.users.findFirst({
          where: eq(users.clerkId, input.clerkId),
        });
        const emailMatches = await selectUsersByNormalizedEmail();

        if (!existingByClerkId) {
          if (emailMatches.length === 0) {
            return insertUser();
          }

          if (emailMatches.length === 1) {
            return updateUser(emailMatches[0].id, input.clerkId);
          }

          throw new Error(
            `Ambiguous user reconciliation for email=${normalizedEmail}`,
          );
        }

        const otherEmailMatches = emailMatches.filter(
          (candidate) => candidate.id !== existingByClerkId.id,
        );

        if (otherEmailMatches.length === 0) {
          return updateUser(existingByClerkId.id, input.clerkId);
        }

        if (otherEmailMatches.length > 1) {
          throw new Error(
            `Ambiguous user reconciliation for email=${normalizedEmail}`,
          );
        }

        const canonicalCandidate = otherEmailMatches[0] as UserRow;
        const refs = await loadUserReferences();
        const [clerkRowHasData, canonicalRowHasData] = await Promise.all([
          hasOwnedData(refs, existingByClerkId.id),
          hasOwnedData(refs, canonicalCandidate.id),
        ]);

        if (!clerkRowHasData && canonicalRowHasData) {
          await tx.delete(users).where(eq(users.id, existingByClerkId.id));
          return updateUser(canonicalCandidate.id, input.clerkId);
        }

        throw new Error(
          `Ambiguous user reconciliation for email=${normalizedEmail}`,
        );
      });
    },

    async deleteByClerkId(clerkId: string) {
      const existing = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
      });

      if (!existing) {
        return null;
      }

      await db.delete(users).where(eq(users.clerkId, clerkId));
      return existing;
    },
  };
}
