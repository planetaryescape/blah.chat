import { marked, type Token, type Tokens } from "marked";
import { readQuantities } from "./quantities";
import type { PreparedNarration, SpeechSegment } from "./types";

export const SPEECH_LIMITS = {
  source: 40_000,
  blocks: 500,
  segments: 1500,
  output: 120_000,
  segment: 1800,
} as const;

export interface CodeBlock {
  blockId: string;
  text: string;
  sourceStart: number;
  sourceEnd: number;
}

export async function speechHash(text: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Splits without dropping whitespace, punctuation, or UTF-16 surrogate pairs. */
export function splitSpeech(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + SPEECH_LIMITS.segment, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    if (end < text.length) {
      const boundary = text.lastIndexOf(" ", end - 1);
      if (boundary > start + SPEECH_LIMITS.segment / 2) end = boundary + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function decodeEntities(text: string): string {
  const named = new Map(
    Object.entries({
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    }),
  );
  return text.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (raw, entity: string) => {
      if (!entity.startsWith("#"))
        return named.get(entity.toLowerCase()) ?? raw;
      const point =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      return point > 0 &&
        point <= 0x10ffff &&
        !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : raw;
    },
  );
}

/** Literal tags are text, never generated voice controls or executable HTML. */
function literal(text: string): string {
  return text.replace(/</g, " less than ").replace(/>/g, " greater than ");
}

/** Invert only Marked's list whitespace normalization, never search content for a match. */
function listContentOffsets(
  item: Tokens.ListItem,
  sourceOffset: (index: number) => number,
): number[] {
  const rawLines = item.raw.split("\n");
  const contentLines = item.text.split("\n");
  const offsets: number[] = [];
  let rawStart = 0;
  let end = sourceOffset(0);
  for (const [lineIndex, content] of contentLines.entries()) {
    const raw = rawLines[lineIndex];
    if (raw === undefined) throw new Error("Unable to map list content line");
    const markerLength =
      lineIndex === 0
        ? (raw.match(/^ {0,3}(?:[*+-]|\d{1,9}[.)])/)?.[0].length ?? 0)
        : 0;
    const expand = (tabs: boolean) => {
      let value = "";
      const positions: number[] = [];
      let local = markerLength;
      let column = markerLength;
      for (const character of raw.slice(markerLength)) {
        const width =
          character === "\t" && tabs
            ? lineIndex === 0
              ? 4 - (column % 4)
              : 4
            : character.length;
        value += character === "\t" && tabs ? " ".repeat(width) : character;
        for (let unit = 0; unit < width; unit++)
          positions.push(
            sourceOffset(rawStart + local + (character === "\t" ? 0 : unit)),
          );
        local += character.length;
        column += character === "\t" && tabs ? width : 1;
      }
      if (lineIndex === 0 && item.task) {
        const taskLength = value.match(/^ *\[[ xX]\] +/)?.[0].length ?? 0;
        value = value.slice(taskLength);
        positions.splice(0, taskLength);
      }
      const removed =
        (value.match(/^ */)?.[0].length ?? 0) -
        (content.match(/^ */)?.[0].length ?? 0);
      if (removed < 0) return null;
      const remainder = value.slice(removed);
      // Only the final item's trimEnd may discard trailing whitespace. No
      // identifier, punctuation, internal whitespace, or code indentation changes.
      if (
        remainder !== content &&
        !(
          lineIndex === contentLines.length - 1 &&
          remainder.trimEnd() === content
        )
      )
        return null;
      return positions.slice(removed, removed + content.length);
    };
    const positions = expand(true) ?? (lineIndex > 0 ? expand(false) : null);
    if (!positions) throw new Error("Unable to map normalized list content");
    for (const position of positions) offsets.push(position);
    end = sourceOffset(rawStart + raw.length);
    if (lineIndex < contentLines.length - 1) offsets.push(end);
    rawStart += raw.length + 1;
  }
  if (rawLines.slice(contentLines.length).some((line) => line.trim()))
    throw new Error("Unmapped substantive list content");
  offsets.push(end);
  return offsets;
}

export function validateNarration(
  result: PreparedNarration,
): PreparedNarration {
  if (
    result.segments.length > SPEECH_LIMITS.segments ||
    result.segments.reduce((sum, segment) => sum + segment.text.length, 0) >
      SPEECH_LIMITS.output
  ) {
    throw new Error(
      "Narration exceeds output limits; source was not shortened",
    );
  }
  for (const segment of result.segments) {
    if (
      !segment.text ||
      segment.text.length > SPEECH_LIMITS.segment ||
      segment.sourceStart < 0 ||
      segment.sourceEnd < segment.sourceStart
    )
      throw new Error("Invalid narration segment");
  }
  return result;
}

export async function prepareDeterministic(
  text: string,
): Promise<{ narration: PreparedNarration; codeBlocks: CodeBlock[] }> {
  if (!text.trim() || text.length > SPEECH_LIMITS.source)
    throw new Error("Speech source requires 1-40000 characters");
  const sourceHash = await speechHash(text);
  const narration: PreparedNarration = {
    version: "1",
    sourceHash,
    segments: [],
    coverage: "complete",
    warnings: [],
    modelAssisted: false,
  };
  const codeBlocks: CodeBlock[] = [];
  let blocks = 0;
  const warn = (warning: string) => {
    if (!narration.warnings.includes(warning)) narration.warnings.push(warning);
  };
  if (/\\(?:frac|sum|int|sqrt|begin|left|right)\b|\\[()[\]]|\$\$/.test(text)) {
    narration.coverage = "partial";
    warn(
      "LaTeX notation is retained as source text; spoken mathematical grouping and pronunciation are unavailable.",
    );
  }
  const block = (start: number, end: number) => {
    if (++blocks > SPEECH_LIMITS.blocks)
      throw new Error("Speech source exceeds 500 blocks");
    return {
      blockId: `${sourceHash.slice(0, 16)}:${start}:${end}`,
      sourceStart: start,
      sourceEnd: end,
    };
  };
  const add = (
    mapping: ReturnType<typeof block>,
    kind: SpeechSegment["kind"],
    value: string,
    role: SpeechSegment["role"] = "source",
    pauseAfterMs = 250,
    headingLevel?: number,
  ) => {
    for (const [index, chunk] of splitSpeech(readQuantities(value)).entries()) {
      const segment: SpeechSegment = {
        ...mapping,
        id: `${mapping.blockId}:${narration.segments.length}:${index}`,
        kind,
        role,
        text: chunk,
        pauseAfterMs: 0,
      };
      if (headingLevel !== undefined) segment.headingLevel = headingLevel;
      narration.segments.push(segment);
    }
    const last = narration.segments.at(-1);
    if (last) last.pauseAfterMs = pauseAfterMs;
    validateNarration(narration);
  };
  const inline = (tokens: Token[]): string =>
    tokens
      .map((token): string => {
        switch (token.type) {
          case "image": {
            narration.coverage = "partial";
            warn(
              "Image pixels unavailable; only author-provided alternative text is narrated. No image URLs were fetched.",
            );
            // SAFETY: Marked's built-in lexer emits Image for the checked image discriminator.
            const image = token as Tokens.Image;
            return `Image${image.text ? `: ${literal(decodeEntities(image.text))}` : ""}. Visual content unavailable.`;
          }
          case "html":
            warn(
              "Literal HTML is read as text, not executed or interpreted as voice controls.",
            );
            return literal(token.raw);
          case "br":
            return "\n";
          case "codespan":
            // SAFETY: Marked's built-in lexer emits Codespan for this discriminator.
            return literal((token as Tokens.Codespan).text);
          case "escape":
            // SAFETY: Marked's built-in lexer emits Escape for this discriminator.
            return literal(decodeEntities((token as Tokens.Escape).text));
          default:
            if ("tokens" in token && Array.isArray(token.tokens))
              return inline(token.tokens);
            return literal(
              decodeEntities("text" in token ? String(token.text) : token.raw),
            );
        }
      })
      .join("");
  const walk = (
    tokens: Token[],
    base: number,
    rawSource: string,
    depth = 0,
    offsets?: number[],
  ) => {
    const sourceOffset = (index: number) => offsets?.[index] ?? base + index;
    let cursor = 0;
    for (const token of tokens) {
      const position = rawSource.indexOf(token.raw, cursor);
      if (position < 0) throw new Error("Unable to map narration to source");
      const start = sourceOffset(position);
      const end = sourceOffset(position + token.raw.length);
      cursor = position + token.raw.length;
      if (token.type === "space" || token.type === "def") continue;
      if (token.type === "list") {
        // SAFETY: Marked's built-in lexer emits List for the checked list discriminator.
        const list = token as Tokens.List;
        let itemCursor = position;
        for (const [index, item] of list.items.entries()) {
          const itemStart = rawSource.indexOf(item.raw, itemCursor);
          if (itemStart < 0) throw new Error("Unable to map list item");
          itemCursor = itemStart + item.raw.length;
          const mapping = block(
            sourceOffset(itemStart),
            sourceOffset(itemCursor),
          );
          add(
            mapping,
            "list",
            `${depth ? `Nested list level ${depth + 1}. ` : ""}${list.ordered ? `Item ${Number(list.start) + index}. ` : "List item. "}${item.task ? (item.checked ? "Checked. " : "Unchecked. ") : ""}`,
            "detail",
            0,
          );
          walk(
            marked.lexer(item.text, { gfm: true }),
            sourceOffset(itemStart),
            item.text,
            depth + 1,
            listContentOffsets(item, (index) =>
              sourceOffset(itemStart + index),
            ),
          );
        }
        continue;
      }
      if (token.type === "blockquote") {
        const mapping = block(start, end);
        add(mapping, "paragraph", "Quote.", "detail", 0);
        // Retain an explicit UTF-16 map while removing only the quote prefixes.
        let quoteText = "";
        const quoteOffsets: number[] = [];
        let local = 0;
        for (const line of token.raw.split(/(?<=\n)/)) {
          const prefix = line.match(/^ {0,3}> ?/)?.[0].length ?? 0;
          for (let index = prefix; index < line.length; index++) {
            quoteText += line[index];
            quoteOffsets.push(sourceOffset(position + local + index));
          }
          local += line.length;
        }
        quoteOffsets.push(end);
        walk(marked.lexer(quoteText), start, quoteText, depth, quoteOffsets);
        continue;
      }
      const mapping = block(start, end);
      if (token.type === "table") {
        // SAFETY: Marked's GFM lexer emits Table for the checked table discriminator.
        const table = token as Tokens.Table;
        const headers = table.header.map((cell) => inline(cell.tokens));
        add(
          mapping,
          "table",
          `Table. Columns: ${headers.map((header, index) => `${index + 1}: ${header || "blank header"}`).join("; ")}.`,
          "detail",
        );
        for (const [rowIndex, row] of table.rows.entries()) {
          const rowHeader = inline(row[0]?.tokens ?? []) || "blank";
          for (const [column, cell] of row.entries()) {
            add(
              mapping,
              "table",
              `Row ${rowIndex + 1}, ${rowHeader}; column ${column + 1}, ${headers[column] || "blank header"}: ${inline(cell.tokens) || "blank (no value)"}.`,
              "detail",
              column === row.length - 1 ? 300 : 100,
            );
          }
        }
      } else if (token.type === "code") {
        // SAFETY: Marked's built-in lexer emits Code for the checked code discriminator.
        const code = token as Tokens.Code;
        codeBlocks.push({ ...mapping, text: code.text });
        add(
          mapping,
          "code",
          `Code${code.lang ? `, ${literal(code.lang)}` : ""}. Technical detail.`,
          "detail",
        );
        code.text.split("\n").forEach((line, index) => {
          const indentation = line.match(/^[\t ]*/)?.[0] ?? "";
          const symbols =
            line.match(
              /!==|===|!=|==|<=|>=|&&|\|\||[+*/%=<>!_&|^{}()[\].,:;?'"`\\-]/g,
            ) ?? [];
          const names = new Map(
            Object.entries({
              "!==": "strictly not equal",
              "===": "strictly equal",
              "!=": "not equal",
              "==": "equal comparison",
              "<=": "less than or equal",
              ">=": "greater than or equal",
              "&&": "logical and",
              "||": "logical or",
              "!": "not",
              _: "underscore",
              "-": "minus",
              "+": "plus",
              "*": "asterisk",
              "/": "slash",
              "%": "percent",
              "=": "equals",
              "<": "less than",
              ">": "greater than",
              "&": "ampersand",
              "|": "vertical bar",
              "^": "caret",
              "{": "open brace",
              "}": "close brace",
              "(": "open parenthesis",
              ")": "close parenthesis",
              "[": "open bracket",
              "]": "close bracket",
              ".": "dot",
              ",": "comma",
              ":": "colon",
              ";": "semicolon",
              "?": "question mark",
              "'": "single quote",
              '"': "double quote",
              "`": "backtick",
              "\\": "backslash",
            }),
          );
          add(
            mapping,
            "code",
            `Line ${index + 1}, indentation ${indentation.replace(/\t/g, "").length} spaces and ${indentation.replace(/ /g, "").length} tabs: ${line ? literal(line) : "blank line"}${symbols.length ? `. Symbols in order: ${symbols.map((symbol) => names.get(symbol)).join(", ")}` : ""}`,
            "detail",
            150,
          );
        });
      } else if (token.type === "html") {
        narration.coverage = "partial";
        warn(
          "Raw HTML structure is unavailable; the exact literal markup is narrated instead.",
        );
        add(mapping, "notice", `Literal HTML. ${literal(token.raw)}`, "detail");
      } else if (token.type === "hr") {
        add(mapping, "notice", "Section break.", "notice", 500);
      } else {
        const value =
          "tokens" in token && Array.isArray(token.tokens)
            ? inline(token.tokens)
            : literal(
                decodeEntities(
                  "text" in token ? String(token.text) : token.raw,
                ),
              );
        // SAFETY: Marked's heading discriminator identifies its Heading depth property.
        const headingLevel =
          token.type === "heading"
            ? (token as Tokens.Heading).depth
            : undefined;
        if (value)
          add(
            mapping,
            token.type === "heading"
              ? "heading"
              : value.includes("Visual content unavailable.")
                ? "figure"
                : depth
                  ? "list"
                  : "paragraph",
            value,
            "source",
            token.type === "heading" ? 500 : 250,
            headingLevel,
          );
        if (
          /\\[a-zA-Z]+|\\[()[\]]|\$[^$\n]+\$|\([^\n)]*[+*/=][^\n)]*\)|\b\w+\s*[+*/^=]\s*\w+/.test(
            value,
          )
        ) {
          narration.coverage = "partial";
          warn(
            "Mathematical notation is retained as source text; grouping and LaTeX pronunciation are not verified.",
          );
          add(
            mapping,
            "notice",
            "Mathematical notation present. Exact notation is retained; spoken grouping and pronunciation are unavailable.",
            "notice",
          );
        }
      }
    }
  };
  // Marked canonicalizes CRLF/CR before lexing. Map that normalization back to
  // the immutable source rather than searching normalized raw tokens in it.
  let normalized = "";
  const offsets: number[] = [];
  for (let index = 0; index < text.length; index++) {
    offsets.push(index);
    if (text[index] === "\r") {
      normalized += "\n";
      if (text[index + 1] === "\n") index++;
    } else normalized += text[index];
  }
  offsets.push(text.length);
  walk(marked.lexer(normalized, { gfm: true }), 0, normalized, 0, offsets);
  return { narration: validateNarration(narration), codeBlocks };
}
