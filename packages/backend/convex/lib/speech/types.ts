/** A speech rendition never replaces the authoritative message Markdown. */
export interface ListItemMembership {
  /** Structural list membership is metadata, never spoken text. */
  listItemId?: string;
  listDepth?: number;
}

export interface SpeechSegment extends ListItemMembership {
  id: string;
  blockId: string;
  kind:
    | "heading"
    | "paragraph"
    | "list"
    | "table"
    | "code"
    | "figure"
    | "notice";
  role: "source" | "detail" | "explanation" | "notice";
  text: string;
  pauseAfterMs: number;
  sourceStart: number;
  sourceEnd: number;
  /** Present only for headings; semantic rank is not spoken aloud. */
  headingLevel?: number;
}

export interface PreparedNarration {
  /** Version 1 remains readable from older deployed/BYOD backends. */
  version: "1" | "2";
  sourceHash: string;
  segments: SpeechSegment[];
  coverage: "complete" | "partial";
  warnings: string[];
  modelAssisted: boolean;
}
