import { z } from "zod";
import { type CodeBlock, splitSpeech, validateNarration } from "./prepare";
import type { PreparedNarration, SpeechSegment } from "./types";

const codeOutline = z
  .object({
    sourceHash: z.string(),
    blockId: z.string(),
    lines: z
      .array(
        z
          .object({
            line: z.number().int().positive(),
            quote: z.string(),
            kind: z.enum([
              "condition",
              "loop",
              "return",
              "function",
              "assignment",
              "source",
            ]),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

/** Model output can only select exact source lines and mechanically verifiable labels. */
export function applyCodeOutline(
  narration: PreparedNarration,
  block: CodeBlock,
  response: string,
  finishReason: string,
): void {
  if (finishReason !== "stop" || response.length > 12_000)
    throw new Error("Incomplete code outline");
  const parsed = codeOutline.parse(JSON.parse(response));
  if (
    parsed.sourceHash !== narration.sourceHash ||
    parsed.blockId !== block.blockId
  )
    throw new Error("Invalid code outline");
  const lines = block.text.split("\n");
  let previous = 0;
  const checks = {
    condition: /\b(if|else|switch|case)\b/,
    loop: /\b(for|while)\b/,
    return: /\breturn\b/,
    function: /\b(function|def)\b/,
    assignment: /=/,
    source: /[\s\S]*/,
  };
  const outline: string[] = [];
  for (const item of parsed.lines) {
    if (
      item.line <= previous ||
      item.quote !== lines[item.line - 1] ||
      !checks[item.kind].test(item.quote)
    )
      throw new Error("Ungrounded code outline");
    previous = item.line;
    outline.push(
      `Source line ${item.line}: ${item.quote.replace(/</g, " less than ").replace(/>/g, " greater than ").replace(/\$/g, " dollar sign ")}`,
    );
  }
  const segments: SpeechSegment[] = splitSpeech(
    `Code explanation. Selected source lines; not a structural analysis or execution results. ${outline.join(". ")}`,
  ).map((text, index) => ({
    ...block,
    id: `${block.blockId}:explanation:${index}`,
    kind: "code",
    role: "explanation",
    text,
    pauseAfterMs: 250,
  }));
  let last = -1;
  for (let index = 0; index < narration.segments.length; index++) {
    if (narration.segments[index].blockId === block.blockId) last = index;
  }
  const candidate = {
    ...narration,
    segments: [
      ...narration.segments.slice(0, last + 1),
      ...segments,
      ...narration.segments.slice(last + 1),
    ],
    modelAssisted: true,
  };
  validateNarration(candidate);
  narration.segments = candidate.segments;
  narration.modelAssisted = true;
}
