import { nanoid } from "nanoid";

/**
 * Bidirectional mapping between Convex `_id` strings and Postgres nanoid strings.
 *
 * Namespaced by entity type to avoid collisions when the same Convex ID
 * appears across different tables. Serializable to/from JSON for checkpoint
 * persistence across re-runs.
 */
export class IdMap {
  /** namespace -> convexId -> pgId */
  private forward = new Map<string, Map<string, string>>();
  /** namespace -> pgId -> convexId */
  private backward = new Map<string, Map<string, string>>();

  /** Get (or create) the Postgres ID for a Convex ID. */
  get(namespace: string, convexId: string): string {
    let nsMap = this.forward.get(namespace);
    if (!nsMap) {
      nsMap = new Map();
      this.forward.set(namespace, nsMap);
    }

    let pgId = nsMap.get(convexId);
    if (!pgId) {
      pgId = nanoid();
      nsMap.set(convexId, pgId);

      let revMap = this.backward.get(namespace);
      if (!revMap) {
        revMap = new Map();
        this.backward.set(namespace, revMap);
      }
      revMap.set(pgId, convexId);
    }

    return pgId;
  }

  /** Get the Postgres ID for an optional Convex ID. Returns undefined if input is nullish. */
  getOptional(
    namespace: string,
    convexId: string | undefined | null,
  ): string | undefined {
    if (convexId == null) return undefined;
    return this.get(namespace, convexId);
  }

  /** Pre-seed a known mapping. Does NOT overwrite existing entries. */
  set(namespace: string, convexId: string, pgId: string): void {
    let nsMap = this.forward.get(namespace);
    if (!nsMap) {
      nsMap = new Map();
      this.forward.set(namespace, nsMap);
    }
    // Don't overwrite
    if (nsMap.has(convexId)) return;

    nsMap.set(convexId, pgId);

    let revMap = this.backward.get(namespace);
    if (!revMap) {
      revMap = new Map();
      this.backward.set(namespace, revMap);
    }
    revMap.set(pgId, convexId);
  }

  /** Reverse lookup: Postgres ID -> Convex ID. */
  reverse(namespace: string, pgId: string): string | undefined {
    return this.backward.get(namespace)?.get(pgId);
  }

  /** Check if a Convex ID has been mapped in a namespace. */
  has(namespace: string, convexId: string): boolean {
    return this.forward.get(namespace)?.has(convexId) ?? false;
  }

  /** Get the Postgres ID only if the Convex ID was already mapped. Returns undefined if not mapped. */
  getIfMapped(
    namespace: string,
    convexId: string | undefined | null,
  ): string | undefined {
    if (convexId == null) return undefined;
    return this.forward.get(namespace)?.get(convexId);
  }

  /** Count of mapped IDs in a namespace. */
  count(namespace: string): number {
    return this.forward.get(namespace)?.size ?? 0;
  }

  /** Serialize to a JSON-safe object for checkpoint persistence. */
  toJSON(): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    for (const [ns, nsMap] of this.forward) {
      result[ns] = Object.fromEntries(nsMap);
    }
    return result;
  }

  /** Restore from a serialized JSON object. */
  static fromJSON(json: Record<string, Record<string, string>>): IdMap {
    const idMap = new IdMap();
    for (const [ns, entries] of Object.entries(json)) {
      for (const [convexId, pgId] of Object.entries(entries)) {
        // Use internal set that always writes (bypass the no-overwrite guard)
        let nsMap = idMap.forward.get(ns);
        if (!nsMap) {
          nsMap = new Map();
          idMap.forward.set(ns, nsMap);
        }
        nsMap.set(convexId, pgId);

        let revMap = idMap.backward.get(ns);
        if (!revMap) {
          revMap = new Map();
          idMap.backward.set(ns, revMap);
        }
        revMap.set(pgId, convexId);
      }
    }
    return idMap;
  }
}
