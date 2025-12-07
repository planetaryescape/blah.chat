/**
 * Tag utility functions for hierarchical tag support
 */

export interface TagNode {
  tag: string; // Full path (e.g., "work/project-a")
  label: string; // Display name (e.g., "project-a")
  count: number;
  depth: number;
  children: TagNode[];
  parent?: string; // Parent tag path
}

/**
 * Parse tag into segments
 * "work/project-a/sprint-1" -> ["work", "project-a", "sprint-1"]
 */
export function parseTagPath(tag: string): string[] {
  return tag.split("/").filter(Boolean);
}

/**
 * Get parent tag path
 * "work/project-a/sprint-1" -> "work/project-a"
 */
export function getParentTag(tag: string): string | null {
  const segments = parseTagPath(tag);
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join("/");
}

/**
 * Get all ancestor paths
 * "work/project-a/sprint-1" -> ["work", "work/project-a"]
 */
export function getAncestorTags(tag: string): string[] {
  const segments = parseTagPath(tag);
  const ancestors: string[] = [];

  for (let i = 1; i < segments.length; i++) {
    ancestors.push(segments.slice(0, i).join("/"));
  }

  return ancestors;
}

/**
 * Get tag depth (0-indexed)
 * "work" -> 0, "work/project-a" -> 1
 */
export function getTagDepth(tag: string): number {
  return parseTagPath(tag).length - 1;
}

/**
 * Get tag label (last segment)
 * "work/project-a/sprint-1" -> "sprint-1"
 */
export function getTagLabel(tag: string): string {
  const segments = parseTagPath(tag);
  return segments[segments.length - 1] || tag;
}

/**
 * Check if tag is child of parent
 * isChildOf("work/project-a", "work") -> true
 */
export function isChildOf(childTag: string, parentTag: string): boolean {
  if (childTag === parentTag) return false;
  return childTag.startsWith(`${parentTag}/`);
}

/**
 * Check if tag is descendant of ancestor (includes grandchildren)
 * isDescendantOf("work/project-a/sprint-1", "work") -> true
 */
export function isDescendantOf(tag: string, ancestor: string): boolean {
  if (tag === ancestor) return false;
  return tag.startsWith(`${ancestor}/`);
}

/**
 * Build hierarchical tag tree from flat tag list with counts
 */
export function buildTagTree(
  tagStats: Array<{ tag: string; count: number }>,
): TagNode[] {
  const nodeMap = new Map<string, TagNode>();
  const rootNodes: TagNode[] = [];

  // First pass: create all nodes
  for (const { tag, count } of tagStats) {
    const segments = parseTagPath(tag);
    const depth = segments.length - 1;
    const label = segments[segments.length - 1] || tag;
    const parent = getParentTag(tag);

    nodeMap.set(tag, {
      tag,
      label,
      count,
      depth,
      children: [],
      parent: parent || undefined,
    });
  }

  // Second pass: build tree structure
  for (const node of nodeMap.values()) {
    if (node.parent && nodeMap.has(node.parent)) {
      // Add to parent's children
      nodeMap.get(node.parent)!.children.push(node);
    } else {
      // Root node
      rootNodes.push(node);
    }
  }

  // Sort children recursively (alphabetical)
  const sortNodes = (nodes: TagNode[]) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(rootNodes);

  return rootNodes;
}

/**
 * Flatten tag tree back to list (for iteration)
 */
export function flattenTagTree(tree: TagNode[]): TagNode[] {
  const result: TagNode[] = [];

  const traverse = (nodes: TagNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  };

  traverse(tree);
  return result;
}

/**
 * Get all descendant tags (for filtering)
 * "work" -> ["work/project-a", "work/project-a/sprint-1", "work/project-b"]
 */
export function getDescendantTags(
  parentTag: string,
  allTags: string[],
): string[] {
  return allTags.filter((tag) => isDescendantOf(tag, parentTag));
}

/**
 * Validate tag format
 * - Lowercase only
 * - Alphanumeric + hyphens
 * - No consecutive or trailing slashes
 */
export function validateTag(tag: string): { valid: boolean; error?: string } {
  if (!tag || tag.trim() === "") {
    return { valid: false, error: "Tag cannot be empty" };
  }

  if (tag !== tag.toLowerCase()) {
    return { valid: false, error: "Tag must be lowercase" };
  }

  if (tag.includes("//")) {
    return { valid: false, error: "Tag cannot have consecutive slashes" };
  }

  if (tag.startsWith("/") || tag.endsWith("/")) {
    return { valid: false, error: "Tag cannot start or end with slash" };
  }

  const segments = parseTagPath(tag);
  for (const segment of segments) {
    if (!/^[a-z0-9-]+$/.test(segment)) {
      return {
        valid: false,
        error: "Tag segments must be lowercase alphanumeric + hyphens",
      };
    }
  }

  return { valid: true };
}

/**
 * Normalize tag (auto-fix common issues)
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/\/+/g, "/") // collapse multiple slashes
    .replace(/^\/|\/$/g, ""); // remove leading/trailing slashes
}
