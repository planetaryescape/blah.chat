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
