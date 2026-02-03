import { bcv_parser } from "bible-passage-reference-parser/esm/bcv_parser.js";
import * as lang from "bible-passage-reference-parser/esm/lang/en.js";

const bcv = new bcv_parser(lang);
bcv.set_options({
  osis_compaction_strategy: "b",
  invalid_passage_strategy: "ignore",
  invalid_sequence_strategy: "ignore",
});

export interface ParsedVerse {
  display: string;
  osis: string;
}

export interface FoundVerse extends ParsedVerse {
  start: number;
  end: number;
}

export function parseVerseReference(text: string): ParsedVerse | null {
  const result = bcv.parse(text);
  const osis = result.osis();
  if (!osis) return null;
  return { display: text.trim(), osis };
}

export function findAllVerses(text: string): FoundVerse[] {
  const result = bcv.parse(text);
  const entities = result.parsed_entities();
  if (!entities?.length) return [];

  return entities
    .filter((e: { osis: string }) => e.osis)
    .map((e: { osis: string; indices: [number, number] }) => ({
      display: text.slice(e.indices[0], e.indices[1]),
      osis: e.osis,
      start: e.indices[0],
      end: e.indices[1],
    }));
}

/**
 * Process text to detect and linkify Bible verse references
 * Supports both explicit syntax [[John 3:16]] and auto-detection
 * Skips code blocks to avoid breaking code.
 */
export function processBibleVerses(text: string): string {
  // Split by code blocks and existing markdown links to avoid processing them
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/);

  return parts
    .map((part) => {
      // If it starts with ` it's code, or it's a markdown link, return unchanged
      if (part.startsWith("`") || part.startsWith("[")) return part;

      // Phase A: Explicit [[John 3:16]] -> [John 3:16](bible://John.3.16)
      let result = part.replace(/\[\[([^\]]+)\]\]/g, (_, ref) => {
        const parsed = parseVerseReference(ref);
        return parsed
          ? `[${parsed.display}](bible://${parsed.osis})`
          : `[[${ref}]]`;
      });

      // Phase B: Auto-detect "John 3:16" style references
      const verses = findAllVerses(result);
      if (verses.length > 0) {
        // Replace in reverse order to preserve indices
        for (const v of [...verses].reverse()) {
          // Skip if already inside a markdown link
          const before = result.slice(0, v.start);
          if (before.match(/\[[^\]]*$/)) continue;

          result =
            result.slice(0, v.start) +
            `[${v.display}](bible://${v.osis})` +
            result.slice(v.end);
        }
      }

      return result;
    })
    .join("");
}
