# Database migration policy

The release workflow runs in three sequential jobs: **build** → **migrate** →
**deploy**. Migrations execute *after* the production build artifact is
ready but *before* the new code goes live. That ordering means migrations
must be safe with both the previously-deployed code (still serving traffic
during migration + deploy) and the new code (about to roll out).

## Expansion-only

Every migration must be **expansion-only**: additive, backwards-compatible,
and tolerated by both the old and new code at runtime.

Allowed in a single deploy:

- New tables, columns with safe defaults
- New indexes (use `CREATE INDEX CONCURRENTLY` or `IF NOT EXISTS`)
- New nullable columns
- New foreign keys (where the data already complies)
- Adding new check constraints with `NOT VALID` then validating later

Not allowed in a single deploy:

- Dropping columns, tables, indexes, or constraints
- Renaming columns or tables
- Adding `NOT NULL` to an existing nullable column without a default
- Tightening data types (e.g. text → varchar(50))
- Removing values from a domain/enum

## Two-deploy contraction

For destructive or breaking changes, split across two releases:

1. **Deploy A** — Add the new shape (new column, new table, etc.).
   Application code writes to both old and new locations and reads
   defensively. Old shape is still required by older deployed code.
2. **Deploy B** — Once Deploy A is fully rolled out and we are confident
   nothing is reading the old shape, drop the old shape in this deploy's
   migrations and remove the dual-write code.

## Rollback

The `rollback.yml` workflow only rolls back the Vercel deployment — it
does **not** revert migrations. Because every migration is expansion-only,
the previous deployment can keep operating on the post-migration schema
without changes. If a migration ever needs to be reversed, write a
forward migration that restores the old shape (deploy B style).

## Reviewing migrations in PRs

When reviewing a PR that ships a Drizzle migration:

- Confirm the SQL only adds — does not drop, rename, or tighten
- Confirm the application code in the same PR only writes to / reads
  from the new shape
- If the change is breaking, confirm there is a follow-up issue or PR
  for the contraction step
