/** A speech rendition never replaces the authoritative message Markdown. */
export interface SpeechSegment {
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
  version: "1";
  sourceHash: string;
  segments: SpeechSegment[];
  coverage: "complete" | "partial";
  warnings: string[];
  modelAssisted: boolean;
}
