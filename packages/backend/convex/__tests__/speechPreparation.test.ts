import { generateText } from "ai";
import { makeFunctionReference } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { applyCodeOutline } from "../lib/speech/assistance";
import {
  prepareDeterministic,
  splitSpeech,
  validateNarration,
} from "../lib/speech/prepare";
import { readQuantities } from "../lib/speech/quantities";
import {
  audioCacheHash,
  MAX_AUDIO_BYTES,
  synthesize,
} from "../lib/speech/synthesis";
import type { PreparedNarration } from "../lib/speech/types";
import {
  createMockIdentity,
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

vi.mock("ai", async (original) => ({
  ...(await original<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const prepare = makeFunctionReference<
  "action",
  { text: string; messageId?: Id<"messages">; requestId?: string },
  PreparedNarration
>("speechPreparation:prepare");
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("faithful structural narration", () => {
  it("keeps shell parameter syntax out of prose currency pronunciation", async () => {
    const { narration } = await prepareDeterministic(
      'Pay $1.00. Inline `echo "$1"`.\n\n```sh\necho "$1"\n```\n\nDo not omit the ending.',
    );
    const code = narration.segments
      .filter((s) => s.kind === "code")
      .map((s) => s.text)
      .join(" ");
    expect(code).toContain('echo "$1"');
    expect(code).toContain("dollar sign");
    expect(code).not.toContain("dollars");
    const all = narration.segments.map((s) => s.text).join(" ");
    expect(all).toContain("1 point zero zero dollars");
    expect(all).toContain('echo " dollar sign 1"');
    expect(narration.segments.at(-1)?.text).toBe("Do not omit the ending.");
  });
  it.each([
    "A <span>literal</span> ending.",
    "| Formula | Value |\n| --- | --- |\n| $x + 2$ | 0 |",
    "| $x$ | Value |\n| --- | --- |\n| label | 0 |",
  ])("discloses partial inline markup and table math: %s", async (source) => {
    const { narration } = await prepareDeterministic(source);
    expect(narration.coverage).toBe("partial");
    expect(narration.warnings.length).toBeGreaterThan(0);
    if (source.startsWith("|"))
      expect(narration.segments.map((s) => s.text).join(" ")).toContain(": 0.");
  });
  it("never announces keyword-bearing comments or strings as verified structure", async () => {
    const { narration, codeBlocks } = await prepareDeterministic(
      '```js\n// return if function\nconst x = "while";\n```',
    );
    applyCodeOutline(
      narration,
      codeBlocks[0],
      JSON.stringify({
        sourceHash: narration.sourceHash,
        blockId: codeBlocks[0].blockId,
        lines: [
          { line: 1, quote: "// return if function", kind: "condition" },
          { line: 2, quote: 'const x = "while";', kind: "loop" },
        ],
      }),
      "stop",
    );
    const explanation = narration.segments
      .filter((s) => s.role === "explanation")
      .map((s) => s.text)
      .join(" ");
    expect(explanation).toContain("Source line 1: // return if function");
    expect(explanation).not.toContain("condition, line");
    expect(explanation).not.toContain("loop, line");
  });
  it("preserves reference coverage and source order across 400 list/quote/wrapping combinations", async () => {
    let checked = 0;
    for (const marker of ["-", "+", "*", "1.", "12)"]) {
      const indent = " ".repeat(marker.length + 1);
      const image = "![diagram][image]";
      const variants = [
        [image],
        [image, `${indent}Do not omit this continuation.`],
        [image, `${indent}[Read the guide][guide]`],
        [image, "", `${indent}[Read the guide][guide]`],
        [`[x] ${image}`, `${indent}Checked continuation.`],
        [
          image,
          `${indent}- [Read the guide][guide]`,
          `${indent}  Nested continuation.`,
        ],
        [image, `${indent}\tTabbed continuation.`],
        [image, "", `${indent}> Quoted [guide]`],
        [
          image,
          "",
          `${indent}\`\`\`js`,
          `${indent}if (ready) {`,
          `${indent}  return false;`,
          `${indent}}`,
          `${indent}\`\`\``,
        ],
        [
          image,
          "",
          `${indent}| Name | Actual |`,
          `${indent}|---|---|`,
          `${indent}| A | -3.050 |`,
        ],
      ];
      for (const newline of ["\n", "\r\n"])
        for (const forward of [true, false])
          for (const quoted of [true, false])
            for (const variant of variants) {
              const lines = [`${marker} ${variant[0]}`, ...variant.slice(1)];
              const body = quoted ? lines.map((line) => `> ${line}`) : lines;
              const definitions = [
                "[image]: https://example.org/image.png",
                "[guide]: https://example.org/guide",
              ];
              const source = (
                forward
                  ? [...body, "", "Final sentence.", "", ...definitions]
                  : [...definitions, "", ...body, "", "Final sentence."]
              ).join(newline);
              const { narration } = await prepareDeterministic(source);
              const spoken = narration.segments
                .map((segment) => segment.text)
                .join("\n");
              expect(spoken).toContain(
                "Image: diagram. Visual content unavailable.",
              );
              expect(spoken).not.toContain("![diagram][image]");
              expect(spoken).not.toContain("https://example.org");
              expect(narration.coverage).toBe("partial");
              expect(narration.warnings.join(" ")).toContain(
                "Image pixels unavailable",
              );
              expect(narration.segments.at(-1)?.text).toBe("Final sentence.");
              expect(narration.segments.at(-1)?.sourceStart).toBe(
                source.indexOf("Final sentence."),
              );
              expect(
                narration.segments.map((segment) => segment.sourceStart),
              ).toEqual(
                narration.segments
                  .map((segment) => segment.sourceStart)
                  .sort((a, b) => a - b),
              );
              checked++;
            }
    }
    expect(checked).toBe(400);
  });
  it("keeps missing references literal without hiding a resolved unavailable image", async () => {
    const source =
      "- ![known diagram][image]\n  ![unresolved diagram][missing]\n  [Unresolved guide][missing]\n\n> ![unresolved quote][missing]\n\n[image]: https://example.org/image.png";
    const { narration } = await prepareDeterministic(source);
    const spoken = narration.segments.map((segment) => segment.text).join("\n");
    expect(spoken).toContain(
      "Image: known diagram. Visual content unavailable.",
    );
    expect(spoken).toContain("![unresolved diagram][missing]");
    expect(spoken).toContain("[Unresolved guide][missing]");
    expect(spoken).toContain("![unresolved quote][missing]");
    expect(spoken.match(/Visual content unavailable\./g) ?? []).toHaveLength(1);
    expect(narration.coverage).toBe("partial");
    expect(narration.warnings.join(" ")).toContain("Image pixels unavailable");
  });
  it("resolves collapsed and shortcut references across quotes and list levels", async () => {
    const source =
      "[Diagram]: https://example.org/image.png\n[Guide]: https://example.org/guide\n\n> - ![Diagram][]\n>   - ![diagram]\n>     [Guide][] and [GUIDE]\n\nFinal.";
    const { narration } = await prepareDeterministic(source);
    const spoken = narration.segments.map((segment) => segment.text).join("\n");
    expect(spoken).toContain("Image: Diagram. Visual content unavailable.");
    expect(spoken).toContain("Image: diagram. Visual content unavailable.");
    expect(spoken).toContain("Guide and GUIDE");
    expect(spoken).not.toContain("![");
    expect(spoken).not.toContain("[Guide]");
    expect(narration.coverage).toBe("partial");
    expect(narration.segments.at(-1)?.text).toBe("Final.");
    expect(narration.segments.at(-1)?.sourceStart).toBe(
      source.indexOf("Final."),
    );
  });
  it.each([
    "\n",
    "\r\n",
  ])("resolves external reference images and links in nested lists and quotes (%j)", async (newline) => {
    const definitions = [
      "[image]: https://example.org/image.png",
      "[guide]: https://example.org/guide",
    ];
    const content = [
      "- ![diagram][image]",
      "  [Read the guide][guide]",
      "  - ![nested diagram][image]",
      "",
      "> ![quoted diagram][image]",
      "> [Quoted guide][guide]",
      "> - ![quoted nested diagram][image]",
      "",
      "Final sentence.",
    ];
    for (const forward of [true, false]) {
      const source = (
        forward
          ? [...content, "", ...definitions]
          : [...definitions, "", ...content]
      ).join(newline);
      const { narration } = await prepareDeterministic(source);
      const spoken = narration.segments
        .map((segment) => segment.text)
        .join("\n");
      for (const alternative of [
        "Image: diagram.",
        "Image: nested diagram.",
        "Image: quoted diagram.",
        "Image: quoted nested diagram.",
        "Read the guide",
        "Quoted guide",
        "Final sentence.",
      ])
        expect(spoken).toContain(alternative);
      expect(spoken).not.toContain("![");
      expect(spoken).not.toContain("][guide]");
      expect(spoken).not.toContain("https://example.org");
      expect(narration.coverage).toBe("partial");
      expect(narration.warnings.join(" ")).toContain(
        "Image pixels unavailable",
      );
      expect(spoken.match(/Visual content unavailable\./g) ?? []).toHaveLength(
        4,
      );
      for (const segment of narration.segments.filter(
        (entry) => entry.kind === "figure",
      )) {
        expect(source.slice(segment.sourceStart, segment.sourceEnd)).toContain(
          "![",
        );
        expect(
          source.slice(segment.sourceStart, segment.sourceEnd),
        ).not.toContain("[image]:");
      }
      expect(narration.segments.map((segment) => segment.sourceStart)).toEqual(
        narration.segments
          .map((segment) => segment.sourceStart)
          .sort((a, b) => a - b),
      );
    }
  });
  it.each([
    "\n",
    "\r\n",
  ])("closes code and quotes before following prose with monotonic end anchors (%j)", async (newline) => {
    const source = [
      "```js",
      "return false;",
      "```",
      "",
      "After code.",
      "",
      "> Quoted first",
      "> quoted continuation",
      "",
      "After quote.",
    ].join(newline);
    const { narration, codeBlocks } = await prepareDeterministic(source);
    const texts = narration.segments.map((segment) => segment.text);
    const codeEnd = narration.segments.find(
      (segment) => segment.text === "End of code.",
    );
    const quoteEnd = narration.segments.find(
      (segment) => segment.text === "End quote.",
    );
    expect(codeEnd).toMatchObject({
      kind: "notice",
      role: "notice",
      sourceStart: codeBlocks[0].sourceEnd,
      sourceEnd: codeBlocks[0].sourceEnd,
    });
    expect(quoteEnd).toMatchObject({
      kind: "notice",
      role: "notice",
      sourceStart:
        source.indexOf("quoted continuation") + "quoted continuation".length,
      sourceEnd:
        source.indexOf("quoted continuation") + "quoted continuation".length,
    });
    expect(texts.indexOf("End of code.")).toBeLessThan(
      texts.indexOf("After code."),
    );
    expect(texts.indexOf("End quote.")).toBeLessThan(
      texts.indexOf("After quote."),
    );
    expect(texts.filter((text) => text === "End of code.")).toHaveLength(1);
    expect(texts.filter((text) => text === "End quote.")).toHaveLength(1);
    expect(narration.segments.map((segment) => segment.sourceStart)).toEqual(
      narration.segments
        .map((segment) => segment.sourceStart)
        .sort((a, b) => a - b),
    );
    const block = codeBlocks[0];
    applyCodeOutline(
      narration,
      block,
      JSON.stringify({
        sourceHash: narration.sourceHash,
        blockId: block.blockId,
        lines: [{ line: 1, quote: "return false;", kind: "return" }],
      }),
      "stop",
    );
    expect(
      narration.segments.findIndex((segment) => segment.role === "explanation"),
    ).toBeLessThan(
      narration.segments.findIndex(
        (segment) => segment.text === "End of code.",
      ),
    );
    expect(narration.segments.map((segment) => segment.sourceStart)).toEqual(
      narration.segments
        .map((segment) => segment.sourceStart)
        .sort((a, b) => a - b),
    );
  });
  it("pronounces precision, signs, units and version components without guessing dates or math delimiters", () => {
    expect(
      readQuantities("-1.20 and 3.050; -0.5%; $3.050; $-1.20; v1.2.3; Q1."),
    ).toBe(
      "minus 1 point two zero and 3 point zero five zero; minus 0 point five percent; 3 point zero five zero dollars; minus 1 point two zero dollars; v one dot two dot three; Q one.",
    );
    expect(
      readQuantities(
        "Keep 01/02/2023, 2025-2026, user_id, 1e-5 and $3.050$ unchanged.",
      ),
    ).toBe("Keep 01/02/2023, 2025-2026, user_id, 1e-5 and $3.050$ unchanged.");
    expect(readQuantities("ordinary prose and 100 ms")).toBe(
      "ordinary prose and 100 ms",
    );
    expect(readQuantities("The final value is -1.20.")).toBe(
      "The final value is minus 1 point two zero.",
    );
  });
  it("maps CRLF, Unicode and significant tabs back to original UTF-16 offsets", async () => {
    const source =
      "# 😀 Heading\r\n\r\n```py\r\n\treturn False\r\n```\r\n\r\nFinal.";
    const { narration } = await prepareDeterministic(source);
    expect(narration.segments[0].text).toBe("😀 Heading");
    expect(narration.segments.some((s) => s.text.includes("1 tabs"))).toBe(
      true,
    );
    expect(narration.segments.at(-1)?.sourceStart).toBe(
      source.indexOf("Final."),
    );
    expect(narration.segments.at(-1)?.sourceEnd).toBe(source.length);
  });
  it("discloses mathematical grouping and LaTeX gaps without silently rewriting either expression", async () => {
    for (const source of [
      "(a+b)/c is not a+(b/c).",
      String.raw`Use $\\frac{a+b}{c}$, not $a+\\frac{b}{c}$.`,
    ]) {
      const { narration } = await prepareDeterministic(source);
      expect(narration.coverage).toBe("partial");
      expect(narration.warnings.join(" ")).toContain("grouping");
      expect(narration.segments.some((s) => s.role === "notice")).toBe(true);
      expect(narration.segments[0].text).toContain("not");
    }
  });
  it("preserves headings, code and full tables inside quotes with original offsets", async () => {
    const source =
      "> ## Quoted heading\n>\n> | Item | Actual |\n> |---|---|\n> | A | -3.050 |\n>\n> ```js\n> return false;\n> ```\n\nFinal.";
    const { narration } = await prepareDeterministic(source);
    expect(
      narration.segments.find((s) => s.kind === "heading")?.headingLevel,
    ).toBe(2);
    expect(narration.segments.map((s) => s.text).join(" ")).toContain(
      "Row 1, A; column 2, Actual: minus 3 point zero five zero",
    );
    expect(narration.segments.map((s) => s.text).join(" ")).toContain(
      "return false",
    );
    for (const segment of narration.segments) {
      expect(segment.sourceEnd).toBeLessThanOrEqual(source.length);
      expect(segment.sourceStart).toBeGreaterThanOrEqual(0);
    }
    expect(narration.segments.slice(-3).map((segment) => segment.text)).toEqual(
      ["End of code.", "End quote.", "Final."],
    );
    expect(narration.coverage).toBe("complete");
  });
  it("keeps heading joins, ordinary prose, exact signs and the distinctive ending", async () => {
    const source =
      "# TL;DR\n\nDo not remove -0.5%, $3.050, or v1.2.3.\n\n## Next\n\nDistinctive final sentence.";
    const { narration } = await prepareDeterministic(source);
    expect(narration.segments.map((s) => s.text)).toEqual([
      "TL;DR",
      "Do not remove minus 0 point five percent, 3 point zero five zero dollars, or v one dot two dot three.",
      "Next",
      "Distinctive final sentence.",
    ]);
    expect(narration.segments[0].headingLevel).toBe(1);
    expect(narration.segments[2].headingLevel).toBe(2);
    expect(narration.segments[0].pauseAfterMs).toBeGreaterThan(0);
    expect(narration.coverage).toBe("complete");
    for (const segment of narration.segments.filter(
      (s) => s.kind === "heading",
    ))
      expect(source.slice(segment.sourceStart, segment.sourceEnd)).toContain(
        segment.text,
      );
    const quantities = narration.segments[1];
    expect(
      source.slice(quantities.sourceStart, quantities.sourceEnd),
    ).toContain("Do not remove -0.5%, $3.050, or v1.2.3.");
    expect((await prepareDeterministic(source)).narration).toEqual(narration);
  });
  it("reads every table value with complete row/column context and blank not zero", async () => {
    const { narration } = await prepareDeterministic(
      "| Account | Actual USD | Forecast USD |\n|---|---|---|\n| A | -3.050 | |\n| B | 0 | 12.00 |\n\nNever an estimate.",
    );
    const text = narration.segments.map((s) => s.text).join("\n");
    expect(text).toContain(
      "Row 1, A; column 2, Actual USD: minus 3 point zero five zero",
    );
    expect(text).toContain(
      "Row 1, A; column 3, Forecast USD: blank (no value)",
    );
    expect(text).toContain("Row 2, B; column 2, Actual USD: 0");
    expect(text).toContain(
      "Row 2, B; column 3, Forecast USD: 12 point zero zero",
    );
    expect(text.endsWith("Never an estimate.")).toBe(true);
  });
  it("retains code identifiers, operators, literals, indentation, negation and return to body", async () => {
    const source =
      '```ts\nif (some_value <= -3 && flag != true) {\n  return "not done";\n}\n```\n\nDo not execute.';
    const { narration, codeBlocks } = await prepareDeterministic(source);
    const text = narration.segments.map((s) => s.text).join("\n");
    expect(codeBlocks[0].text).toContain('return "not done"');
    expect(text).toContain("some_value");
    expect(text).toContain("less than or equal");
    expect(text).toContain("not equal");
    expect(text).toContain("indentation 2 spaces");
    expect(text.endsWith("Do not execute.")).toBe(true);
  });
  it("preserves nested lists and source order without lost substantive blocks", async () => {
    const source =
      "# Header\n\n- First\n  - Nested negative -3\n- Second\n\nFinal.";
    const { narration } = await prepareDeterministic(source);
    const joined = narration.segments.map((s) => s.text).join(" ");
    for (const value of [
      "Header",
      "First",
      "Nested negative minus 3",
      "Second",
      "Final.",
    ])
      expect(joined).toContain(value);
    expect(joined.indexOf("First")).toBeLessThan(joined.indexOf("Nested"));
    expect(joined.indexOf("Nested")).toBeLessThan(joined.indexOf("Second"));
    expect(narration.segments.map((s) => s.sourceStart)).toEqual(
      narration.segments.map((s) => s.sourceStart).sort((a, b) => a - b),
    );
  });
  it.each([
    "\n",
    "\r\n",
  ])("maps wrapped unordered and ordered items to exact source spans (%j)", async (newline) => {
    const source = [
      "- First 😀 line",
      "  continuation line",
      "- Second line",
      "",
      "7. Ordered 😀 line",
      "   ordered continuation",
      "8. Last item",
      "",
      "Final sentence.",
    ].join(newline);
    const { narration } = await prepareDeterministic(source);
    const sourceSegments = narration.segments.filter(
      (segment) => segment.role === "source",
    );
    expect(sourceSegments.map((segment) => segment.text)).toEqual([
      "First 😀 line\ncontinuation line",
      "Second line",
      "Ordered 😀 line\nordered continuation",
      "Last item",
      "Final sentence.",
    ]);
    expect(
      sourceSegments.map((segment) => [segment.sourceStart, segment.sourceEnd]),
    ).toEqual([
      [
        source.indexOf("First"),
        source.indexOf("continuation line") + "continuation line".length,
      ],
      [source.indexOf("Second"), source.indexOf(`${newline}${newline}7.`)],
      [
        source.indexOf("Ordered"),
        source.indexOf("ordered continuation") + "ordered continuation".length,
      ],
      [
        source.indexOf("Last item"),
        source.indexOf(`${newline}${newline}Final`),
      ],
      [source.indexOf("Final"), source.length],
    ]);
    expect(
      narration.segments
        .filter((segment) => segment.role === "detail")
        .map((segment) => segment.text),
    ).toEqual(["List item. ", "List item. ", "Item 7. ", "Item 8. "]);
    expect(narration.coverage).toBe("complete");
  });
  it.each([
    "\n",
    "\r\n",
  ])("retains wrapped nested lists, multiline code, quotes and table cells (%j)", async (newline) => {
    const source = [
      "- Parent 😀",
      "  parent continuation",
      "  - Nested 😀",
      "    nested continuation",
      "",
      "    ```ts",
      "    if (ready) {",
      "      return false;",
      "    }",
      "    ```",
      "",
      "    > Quoted first",
      "    > quoted continuation",
      "",
      "    | Name | Actual |",
      "    |---|---|",
      "    | A | -3.050 |",
      "- Sibling",
      "",
      "Final sentence.",
    ].join(newline);
    const { narration, codeBlocks } = await prepareDeterministic(source);
    const spoken = narration.segments.map((segment) => segment.text).join("\n");
    for (const value of [
      "Parent 😀\nparent continuation",
      "Nested 😀\nnested continuation",
      "return false",
      "Quoted first\nquoted continuation",
      "Row 1, A; column 2, Actual: minus 3 point zero five zero",
      "Sibling",
      "Final sentence.",
    ])
      expect(spoken).toContain(value);
    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0].text).toBe("if (ready) {\n  return false;\n}");
    expect(codeBlocks[0].sourceStart).toBe(source.indexOf("```ts"));
    expect(
      source.slice(codeBlocks[0].sourceStart, codeBlocks[0].sourceEnd),
    ).toContain(`      return false;${newline}`);
    const quote = narration.segments.find(
      (segment) => segment.text === "Quoted first\nquoted continuation",
    );
    expect(quote?.sourceStart).toBe(source.indexOf("Quoted first"));
    expect(quote?.sourceEnd).toBe(
      source.indexOf("quoted continuation") + "quoted continuation".length,
    );
    const table = narration.segments.filter(
      (segment) => segment.kind === "table",
    );
    expect(table).toHaveLength(3);
    expect(
      table.every(
        (segment) =>
          segment.sourceStart === source.indexOf("| Name | Actual |"),
      ),
    ).toBe(true);
    const labels = narration.segments.filter(
      (segment) => segment.role === "detail" && segment.kind === "list",
    );
    expect(labels.map((segment) => segment.text)).toEqual([
      "List item. ",
      "Nested list level 2. List item. ",
      "List item. ",
    ]);
    expect(labels.map((segment) => segment.sourceStart)).toEqual([
      0,
      source.indexOf("- Nested"),
      source.indexOf("- Sibling"),
    ]);
    expect(narration.segments.map((segment) => segment.sourceStart)).toEqual(
      narration.segments
        .map((segment) => segment.sourceStart)
        .sort((a, b) => a - b),
    );
    expect(spoken.match(/parent continuation/g) ?? []).toHaveLength(1);
    expect(spoken.match(/nested continuation/g) ?? []).toHaveLength(1);
    expect(narration.segments.at(-1)?.sourceEnd).toBe(source.length);
    expect(narration.coverage).toBe("complete");
  });
  it("maps task markers, tab-expanded content and lazy continuations without losing code indentation", async () => {
    const source =
      "- [x] Task 😀\n  wrapped task\n-\tTabbed 😀\n\ttab continuation\n- Lazy first\nlazy continuation\n- Code\n\n  ```py\n  \tif ready:\n  \t\treturn False\n  ```\n\nEnd.";
    const { narration, codeBlocks } = await prepareDeterministic(source);
    const values = narration.segments.filter(
      (segment) => segment.role === "source",
    );
    expect(values.map((segment) => segment.text)).toEqual([
      "Task 😀\nwrapped task",
      "Tabbed 😀\ntab continuation",
      "Lazy first\nlazy continuation",
      "Code",
      "End.",
    ]);
    expect(values.slice(0, 3).map((segment) => segment.sourceStart)).toEqual([
      source.indexOf("Task"),
      source.indexOf("Tabbed"),
      source.indexOf("Lazy"),
    ]);
    expect(narration.segments[0].text).toBe("List item. Checked. ");
    expect(codeBlocks[0].text).toBe("    if ready:\n        return False");
    expect(
      narration.segments.some((segment) =>
        segment.text.includes("indentation 8 spaces"),
      ),
    ).toBe(true);
    expect(codeBlocks[0].sourceStart).toBe(source.indexOf("```py"));
    expect(
      source.slice(codeBlocks[0].sourceStart, codeBlocks[0].sourceEnd),
    ).toContain("\t\treturn False");
  });
  it("distinguishes repeated wrapped items and paragraph boundaries instead of mapping to the first matching text", async () => {
    const source =
      "  10) Same 😀\n      continuation\n\n      next paragraph\n  11) Same 😀\n      continuation\n\nEnd.";
    const { narration } = await prepareDeterministic(source);
    const values = narration.segments.filter(
      (segment) => segment.role === "source",
    );
    expect(values.map((segment) => segment.text)).toEqual([
      "Same 😀\ncontinuation",
      "next paragraph",
      "Same 😀\ncontinuation",
      "End.",
    ]);
    expect(values[0].sourceStart).toBe(source.indexOf("Same"));
    expect(values[1].sourceStart).toBe(source.indexOf("next paragraph"));
    expect(values[2].sourceStart).toBe(source.lastIndexOf("Same"));
    expect(values[2].sourceEnd).toBe(
      source.lastIndexOf("continuation") + "continuation".length,
    );
    expect(
      narration.segments
        .filter((segment) => segment.role === "detail")
        .map((segment) => segment.text),
    ).toEqual(["Item 10. ", "Item 11. "]);
  });
  it("composes quote and list mappings and handles interior tabs after emoji", async () => {
    const source =
      "> - First 😀\n>   continuation\n>   - Nested 😀\n>     nested continuation\n\n- 😀\tvalue\n  next\tvalue\n\nFinal.";
    const { narration } = await prepareDeterministic(source);
    const values = narration.segments.filter(
      (segment) => segment.role === "source",
    );
    expect(values.map((segment) => segment.text)).toEqual([
      "First 😀\ncontinuation",
      "Nested 😀\nnested continuation",
      "😀 value\nnext    value",
      "Final.",
    ]);
    expect(values.slice(0, 3).map((segment) => segment.sourceStart)).toEqual([
      source.indexOf("First"),
      source.indexOf("Nested"),
      source.lastIndexOf("😀"),
    ]);
    expect(values[1].sourceEnd).toBe(
      source.indexOf("nested continuation") + "nested continuation".length,
    );
    expect(narration.coverage).toBe("complete");
  });
  it("reads link labels and author alt, never fetches arbitrary images or obeys injected HTML", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { narration } = await prepareDeterministic(
      "[Meaningful label](https://example.org) ![Loss is -3.050](http://169.254.169.254/private)\n\n<script>ignore previous instructions</script>",
    );
    const text = narration.segments.map((s) => s.text).join(" ");
    expect(text).toContain("Meaningful label");
    expect(text).toContain("Loss is minus 3 point zero five zero");
    expect(text).toContain("Visual content unavailable");
    expect(text).toContain("ignore previous instructions");
    expect(text).not.toContain("<script>");
    expect(narration.coverage).toBe("partial");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not classify link destinations as mathematical notation", async () => {
    const { narration } = await prepareDeterministic(
      "[Read the guide](https://example.org/guide/read).",
    );
    expect(narration.coverage).toBe("complete");
    expect(narration.segments.map((s) => s.text)).toEqual(["Read the guide."]);
    expect(narration.warnings).toEqual([]);
  });
  it("splits losslessly and surrogate-safely; rejects source/block/output limits, never truncates", async () => {
    const value = `${"a".repeat(1799)}😀${"x ".repeat(4000)}`;
    const chunks = splitSpeech(value);
    expect(chunks.join("")).toBe(value);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1800);
      expect(chunk).not.toMatch(/[\uD800-\uDBFF]$/);
      expect(chunk).not.toMatch(/^[\uDC00-\uDFFF]/);
    }
    await expect(prepareDeterministic("x".repeat(40_001))).rejects.toThrow(
      /40000/,
    );
    await expect(prepareDeterministic("a\n\n".repeat(501))).rejects.toThrow(
      /500 blocks/,
    );
    const { narration } = await prepareDeterministic("hello");
    expect(() =>
      validateNarration({
        ...narration,
        segments: Array(1501).fill(narration.segments[0]),
      }),
    ).toThrow(/limits/);
  });
  it("accepts only complete, ordered, exact-source AI outlines and retains technical detail on failure", async () => {
    const { narration, codeBlocks } = await prepareDeterministic(
      "```js\nif (x != 0) {\n  return false;\n}\n```\n\nEnd.",
    );
    const block = codeBlocks[0];
    const valid = {
      sourceHash: narration.sourceHash,
      blockId: block.blockId,
      lines: [{ line: 1, quote: "if (x != 0) {", kind: "condition" }],
    };
    const before = structuredClone(narration);
    for (const [output, finish] of [
      [JSON.stringify(valid), "length"],
      [JSON.stringify({ ...valid, sourceHash: "stale" }), "stop"],
      [
        JSON.stringify({
          ...valid,
          lines: [{ line: 1, quote: "it prints 100", kind: "source" }],
        }),
        "stop",
      ],
      ['{"lines":', "stop"],
    ]) {
      expect(() =>
        applyCodeOutline(narration, block, output, finish),
      ).toThrow();
      expect(narration).toEqual(before);
    }
    applyCodeOutline(narration, block, JSON.stringify(valid), "stop");
    expect(narration.modelAssisted).toBe(true);
    expect(narration.segments.filter((s) => s.role === "detail")).toEqual(
      before.segments.filter((s) => s.role === "detail"),
    );
    expect(narration.segments.at(-1)?.text).toBe("End.");
  });
});

async function fixture() {
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "speech-owner" }),
    );
    await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "speech-outsider" }),
    );
    const conversation = await ctx.db.insert(
      "conversations",
      createTestConversationData(owner),
    );
    const message = await ctx.db.insert(
      "messages",
      createTestMessageData(conversation, owner, {
        content: "Private canonical content.",
      }),
    );
    return { owner, message };
  });
  const client = t.withIdentity(
    createMockIdentity({ subject: "speech-owner" }),
  );
  await client.mutation(api.users.updatePreferences, {
    preferences: { ttsEnabled: true },
  });
  return { t, client, ...ids };
}

describe("preparation and synthesis access boundaries", () => {
  it("retains a cancellation tombstone before begin, denies foreign cancellation and never cancels a newer request", async () => {
    const { t, client, owner } = await fixture();
    const old = crypto.randomUUID();
    const next = crypto.randomUUID();
    await client.mutation(api.speechPreparation.cancel, { requestId: old });
    const result = await client.action(prepare, {
      requestId: old,
      text: "```js\nreturn 1;\n```",
    });
    expect(generateText).not.toHaveBeenCalled();
    expect(result.segments.map((s) => s.text).join(" ")).toContain("return 1;");
    expect(
      await t.mutation(internal.speechPreparation.beginSession, {
        userId: owner,
        requestId: next,
        sourceHash: "source",
      }),
    ).toBe(true);
    const foreign = t.withIdentity(
      createMockIdentity({ subject: "speech-outsider" }),
    );
    await foreign.mutation(api.speechPreparation.cancel, { requestId: next });
    expect(
      await t.query(internal.speechPreparation.sessionActive, {
        userId: owner,
        requestId: next,
        sourceHash: "stale-source",
      }),
    ).toBe(false);
    await client.mutation(api.speechPreparation.cancel, { requestId: old });
    expect(
      await t.query(internal.speechPreparation.sessionActive, {
        userId: owner,
        requestId: next,
        sourceHash: "source",
      }),
    ).toBe(true);
    await expect(
      t.mutation(api.speechPreparation.cancel, { requestId: next }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      client.mutation(api.speechPreparation.cancel, {
        requestId: "oversized".repeat(100),
      }),
    ).rejects.toThrow();
  });
  it("records a pending provider call but cancellation prevents the remaining optional calls", async () => {
    const { t, client } = await fixture();
    const requestId = crypto.randomUUID();
    let release!: () => void;
    let began!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    vi.mocked(generateText).mockImplementation(async () => {
      began();
      await pending;
      // SAFETY: Only the SDK fields consumed by preparation are needed in this provider fixture.
      return {
        text: "{}",
        finishReason: "length",
        usage: { inputTokens: 7, outputTokens: 3 },
      } as Awaited<ReturnType<typeof generateText>>;
    });
    const running = client.action(prepare, {
      requestId,
      text: "```js\nreturn 1;\n```\n\n```js\nreturn 2;\n```",
    });
    await started;
    await client.mutation(api.speechPreparation.cancel, { requestId });
    release();
    const result = await running;
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(
      (await t.run((ctx) => ctx.db.query("usageRecords").collect()))[0],
    ).toMatchObject({ inputTokens: 7, outputTokens: 3, messageCount: 1 });
    expect(result.segments.map((s) => s.text).join(" ")).toContain("return 2;");
  });
  it("atomically deduplicates concurrent synthesis and releases a failed winner for retry", async () => {
    const { t, client } = await fixture();
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    let release!: () => void;
    let began!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    const fetch = vi.fn(async () => {
      began();
      await pending;
      return new Response(new Uint8Array([1, 2]), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    });
    vi.stubGlobal("fetch", fetch);
    const first = client.action(api.tts.generateSpeech, { text: "dedupe" });
    await started;
    const second = client.action(api.tts.generateSpeech, { text: "dedupe" });
    // Keep the winner's provider unresolved while the duplicate reaches admission.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(0);
    release();
    const results = await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.cost).filter((cost) => cost > 0)).toHaveLength(
      1,
    );
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("ttsSynthesisClaims").collect()),
    ).toHaveLength(0);
    fetch.mockImplementationOnce(
      async () => new Response("failure", { status: 500 }),
    );
    await expect(
      client.action(api.tts.generateSpeech, { text: "retry" }),
    ).rejects.toThrow(/failed/);
    expect(
      await t.run((ctx) => ctx.db.query("ttsSynthesisClaims").collect()),
    ).toHaveLength(0);
    expect(
      (await client.action(api.tts.generateSpeech, { text: "retry" }))
        .audioBase64,
    ).toBe("AQI=");
  });
  it("isolates claim owners and fences stale release and stale cache completion", async () => {
    const { t, owner } = await fixture();
    const other = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "speech-outsider"))
        .unique(),
    );
    if (!other) throw new Error("Missing fixture owner");
    const old = { userId: owner, hash: "same", claimToken: "old" };
    expect(await t.mutation(internal.ttsCache.claimSynthesis, old)).toBe(true);
    expect(
      await t.mutation(internal.ttsCache.claimSynthesis, {
        ...old,
        claimToken: "duplicate",
      }),
    ).toBe(false);
    expect(
      await t.mutation(internal.ttsCache.claimSynthesis, {
        ...old,
        userId: other._id,
      }),
    ).toBe(true);
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("ttsSynthesisClaims")
        .withIndex("by_user_hash", (q) =>
          q.eq("userId", owner).eq("hash", "same"),
        )
        .unique();
      if (row) await ctx.db.patch(row._id, { expiresAt: 0 });
    });
    expect(
      await t.mutation(internal.ttsCache.claimSynthesis, {
        ...old,
        claimToken: "new",
      }),
    ).toBe(true);
    await t.mutation(internal.ttsCache.releaseSynthesis, old);
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["old audio"])),
    );
    await expect(
      t.mutation(internal.ttsCache.saveCache, {
        ...old,
        storageId,
        text: "",
        voice: "aura-asteria-en",
        speed: 1,
        format: "mp3",
      }),
    ).rejects.toThrow(/expired/);
    const claims = await t.run((ctx) =>
      ctx.db.query("ttsSynthesisClaims").collect(),
    );
    expect(claims.find((c) => c.userId === owner)?.claimToken).toBe("new");
    expect(
      await t.run((ctx) => ctx.db.query("ttsCache").collect()),
    ).toHaveLength(0);
  });
  it("records late provider usage and removes an unreferenced blob when its old claim can no longer commit", async () => {
    const { t, client, owner } = await fixture();
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    let release!: () => void;
    let began!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        began();
        await pending;
        return new Response(new Uint8Array([1, 2]), {
          headers: { "Content-Type": "audio/mpeg" },
        });
      }),
    );
    const running = client.action(api.tts.generateSpeech, { text: "late" });
    await started;
    const hash = await audioCacheHash(
      owner,
      "late",
      "aura-asteria-en",
      1,
      "server",
    );
    await t.run(async (ctx) => {
      const claim = await ctx.db
        .query("ttsSynthesisClaims")
        .withIndex("by_user_hash", (q) =>
          q.eq("userId", owner).eq("hash", hash),
        )
        .unique();
      if (claim) await ctx.db.patch(claim._id, { expiresAt: 0 });
    });
    await t.mutation(internal.ttsCache.claimSynthesis, {
      userId: owner,
      hash,
      claimToken: "replacement",
    });
    release();
    expect((await running).cost).toBeGreaterThan(0);
    expect(
      (await t.run((ctx) => ctx.db.query("usageRecords").collect()))[0].cost,
    ).toBeGreaterThan(0);
    expect(
      await t.run((ctx) => ctx.db.query("ttsCache").collect()),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.system.query("_storage").collect()),
    ).toHaveLength(0);
    expect(
      (await t.run((ctx) => ctx.db.query("ttsSynthesisClaims").collect()))[0]
        .claimToken,
    ).toBe("replacement");
  });
  it("returns bounded busy HTTP admission with Retry-After and no provider call", async () => {
    const { t, client, owner } = await fixture();
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    const hash = await audioCacheHash(
      owner,
      "busy",
      "aura-asteria-en",
      1,
      "server",
    );
    await t.mutation(internal.ttsCache.claimSynthesis, {
      userId: owner,
      hash,
      claimToken: "winner",
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await client.fetch("/tts?text=busy");
    expect(result.status).toBe(409);
    expect(result.headers.get("Retry-After")).toBe("1");
    expect(fetch).not.toHaveBeenCalled();
    expect(
      await t.run((ctx) => ctx.db.query("usageRecords").collect()),
    ).toHaveLength(0);
  }, 10_000);
  it("bounds expired cleanup batches and rejects excessive outstanding preparation requests", async () => {
    const { t, client, owner } = await fixture();
    await t.run(async (ctx) => {
      for (let index = 0; index < 101; index++) {
        await ctx.db.insert("speechPreparationSessions", {
          userId: owner,
          requestId: crypto.randomUUID(),
          cancelled: true,
          expiresAt: 0,
        });
        await ctx.db.insert("ttsSynthesisClaims", {
          userId: owner,
          hash: String(index),
          claimToken: "expired",
          expiresAt: 0,
        });
      }
    });
    await t.mutation(internal.speechPreparation.cleanupExpired, {});
    await t.mutation(internal.ttsCache.cleanupExpiredClaims, {});
    expect(
      await t.run((ctx) => ctx.db.query("speechPreparationSessions").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("ttsSynthesisClaims").collect()),
    ).toHaveLength(1);
    await t.run(async (ctx) => {
      for (let index = 0; index < 100; index++)
        await ctx.db.insert("speechPreparationSessions", {
          userId: owner,
          requestId: crypto.randomUUID(),
          cancelled: true,
          expiresAt: Date.now() + 60_000,
        });
    });
    await expect(
      client.mutation(api.speechPreparation.cancel, {
        requestId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/limit/);
  });
  it("rechecks recorded spend before each optional outline and preserves remaining code", async () => {
    const { t, client } = await fixture();
    vi.stubEnv("DEFAULT_MONTHLY_BUDGET", "0.000001");
    // SAFETY: This SDK fixture includes every result field consumed by preparation.
    vi.mocked(generateText).mockResolvedValue({
      text: "{}",
      finishReason: "length",
      usage: {
        inputTokens: 1000000,
        outputTokens: 20,
        outputTokenDetails: { reasoningTokens: 9 },
      },
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await client.action(prepare, {
      text: "```js\nreturn 1;\n```\n\n```js\nreturn 2;\n```",
    });
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(result.segments.map((s) => s.text).join(" ")).toContain("return 2;");
    expect(result.warnings.join(" ")).toContain("budget");
    const usage = await t.run((ctx) => ctx.db.query("usageRecords").collect());
    expect(usage[0].reasoningTokens).toBe(9);
  });
  it.each([
    "empty",
    "missing",
  ])("repairs an unusable %s cached blob instead of charging on every replay", async (mode) => {
    const { t, client, owner } = await fixture();
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    const hash = await audioCacheHash(
      owner,
      "repair",
      "aura-asteria-en",
      1,
      "server",
    );
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob([]));
      if (mode === "missing") await ctx.storage.delete(storageId);
      await ctx.db.insert("ttsCache", {
        hash,
        storageId,
        text: "",
        voice: "aura-asteria-en",
        speed: 1,
        format: "mp3",
        createdAt: 0,
        lastAccessedAt: 0,
      });
    });
    const fetch = vi.fn(
      async () =>
        new Response(new Uint8Array([4, 5]), {
          headers: { "Content-Type": "audio/mpeg" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    expect(
      (await client.action(api.tts.generateSpeech, { text: "repair" })).cost,
    ).toBeGreaterThan(0);
    expect(
      (await client.action(api.tts.generateSpeech, { text: "repair" })).cost,
    ).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      await t.run((ctx) => ctx.db.query("ttsCache").collect()),
    ).toHaveLength(1);
  });
  it("retains the established all-provider user recorded-cost budget, including BYOK", async () => {
    const { t, client, owner } = await fixture();
    vi.stubEnv("DEFAULT_MONTHLY_BUDGET", "1");
    await t.run((ctx) =>
      ctx.db.insert("usageRecords", {
        userId: owner,
        date: new Date().toISOString().slice(0, 10),
        model: "deepgram:tts",
        operationType: "tts",
        feature: "chat",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0.25,
        messageCount: 1,
        isByok: true,
      }),
    );
    expect(
      await client.query(api.usage.checkBudget.checkBudget, { userId: owner }),
    ).toMatchObject({ totalSpend: 0.25, remaining: 0.75 });
  });
  it("separates malformed input from configuration and upstream failures without leaking provider text", async () => {
    const { t, client } = await fixture();
    expect(
      (
        await t
          .withIdentity(createMockIdentity({ subject: "unregistered" }))
          .fetch("/tts?text=private")
      ).status,
    ).toBe(401);
    expect(
      (await client.fetch("/tts", { method: "POST", body: "{" })).status,
    ).toBe(400);
    vi.stubEnv("DEEPGRAM_API_KEY", "");
    expect((await client.fetch("/tts?text=private")).status).toBe(503);
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("private provider echo", { status: 503 })),
    );
    const failed = await client.fetch("/tts?text=private");
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("private");
    expect((await client.fetch("/tts?text=private&speed=99")).status).toBe(400);
  });
  it("rejects a synthesis estimate exceeding remaining budget without a provider call", async () => {
    const { client } = await fixture();
    vi.stubEnv("DEFAULT_MONTHLY_BUDGET", "0.000001");
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      client.action(api.tts.generateSpeech, { text: "Too expensive" }),
    ).rejects.toThrow(/budget/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("bounds AI calls to four, retains all detail on invalid/truncated/failing output, and records each call", async () => {
    const { t, client } = await fixture();
    // SAFETY: This SDK mock supplies every field consumed by preparation; no other result fields are observed.
    vi.mocked(generateText).mockImplementation(
      async () =>
        ({
          text: "{}",
          finishReason: "length",
          usage: { inputTokens: 10, outputTokens: 20 },
        }) as Awaited<ReturnType<typeof generateText>>,
    );
    const source = Array.from(
      { length: 6 },
      (_, index) => `\`\`\`js\nreturn ${index};\n\`\`\``,
    ).join("\n\n");
    const result = await client.action(prepare, { text: source });
    expect(generateText).toHaveBeenCalledTimes(4);
    expect(result.modelAssisted).toBe(false);
    for (let index = 0; index < 6; index++)
      expect(result.segments.map((s) => s.text).join(" ")).toContain(
        `return ${index}`,
      );
    expect(result.warnings).toHaveLength(6);
    const usage = await t.run((ctx) => ctx.db.query("usageRecords").collect());
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({
      inputTokens: 40,
      outputTokens: 80,
      messageCount: 4,
    });
    expect(usage[0].cost).toBeGreaterThan(0);
  });
  it("records provider usage on thrown failures and retains the original technical path", async () => {
    const { t, client } = await fixture();
    vi.mocked(generateText).mockRejectedValue(
      Object.assign(new Error("private provider payload"), {
        usage: {
          inputTokens: 7,
          outputTokens: 3,
          outputTokenDetails: { reasoningTokens: 5 },
        },
      }),
    );
    const result = await client.action(prepare, {
      text: "```js\nreturn false;\n```",
    });
    expect(result.modelAssisted).toBe(false);
    expect(result.segments.map((s) => s.text).join(" ")).toContain(
      "return false",
    );
    expect(JSON.stringify(result)).not.toContain("private provider payload");
    const usage = await t.run((ctx) => ctx.db.query("usageRecords").collect());
    expect(usage[0]).toMatchObject({
      inputTokens: 7,
      outputTokens: 3,
      reasoningTokens: 5,
      messageCount: 1,
    });
  });
  it("authenticates preparation first, denies foreign messages and canonical mismatch", async () => {
    const { t, client, message } = await fixture();
    await expect(t.action(prepare, { text: "hello" })).rejects.toThrow(
      /Unauthorized/,
    );
    const foreign = t.withIdentity(
      createMockIdentity({ subject: "speech-outsider" }),
    );
    await foreign.mutation(api.users.updatePreferences, {
      preferences: { ttsEnabled: true },
    });
    await expect(
      foreign.action(prepare, {
        text: "Private canonical content.",
        messageId: message,
      }),
    ).rejects.toThrow(/Unauthorized source/);
    await expect(
      client.action(prepare, { text: "changed", messageId: message }),
    ).rejects.toThrow(/canonical/);
    expect(
      (
        await client.action(prepare, {
          text: "Private canonical content.",
          messageId: message,
        })
      ).segments[0].text,
    ).toBe("Private canonical content.");
    await client.mutation(api.users.updatePreferences, {
      preferences: { ttsEnabled: false },
    });
    await expect(client.action(prepare, { text: "hello" })).rejects.toThrow(
      /disabled/,
    );
  });
  it("BYOK preparation falls back locally and synthesis fails closed without its Deepgram key", async () => {
    const { t, client, owner } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.insert("userApiKeys", {
        userId: owner,
        byokEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("DEEPGRAM_API_KEY", "server-must-not-be-used");
    const result = await client.action(prepare, {
      text: "```js\nreturn false;\n```",
    });
    expect(result.warnings.join(" ")).toContain("BYOK");
    expect(result.segments.some((s) => s.text.includes("return false"))).toBe(
      true,
    );
    await expect(
      client.action(api.tts.generateSpeech, { text: "private" }),
    ).rejects.toThrow(/BYOK Deepgram key required/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("owner- and configuration-scopes audio cache keys", async () => {
    const first = await audioCacheHash(
      "owner-a",
      "private",
      "aura-asteria-en",
      1,
      "server",
    );
    expect(first).not.toBe(
      await audioCacheHash(
        "owner-b",
        "private",
        "aura-asteria-en",
        1,
        "server",
      ),
    );
    expect(first).not.toBe(
      await audioCacheHash(
        "owner-a",
        "private",
        "aura-asteria-en",
        1,
        "byok:1",
      ),
    );
    expect(first).not.toBe(
      await audioCacheHash(
        "owner-a",
        "private",
        "aura-asteria-en",
        1.1,
        "server",
      ),
    );
  });
  it("POST private body, legacy GET and public action share preference/auth enforcement, return bytes not redirects", async () => {
    const { t, client } = await fixture();
    vi.stubEnv("DEEPGRAM_API_KEY", "test-key");
    const fetch = vi.fn(
      async (_url: URL | RequestInfo, _options?: RequestInit) =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "audio/mpeg" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const unauthenticated = await t.fetch("/tts", {
      method: "POST",
      body: JSON.stringify({ text: "secret" }),
    });
    expect(unauthenticated.status).toBe(401);
    const post = await client.fetch("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "secret" }),
    });
    expect(post.status).toBe(200);
    expect(post.headers.get("location")).toBeNull();
    expect(new Uint8Array(await post.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(String(fetch.mock.calls[0][0])).not.toContain("secret");
    expect(fetch.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ text: "secret" }),
    );
    expect(fetch.mock.calls[0][1]?.method).toBe("POST");
    expect(fetch.mock.calls[0][1]?.headers).toEqual({
      Authorization: "Token test-key",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    });
    const get = await client.fetch("/tts?text=secret");
    expect(get.status).toBe(200);
    expect(get.headers.get("location")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    const other = t.withIdentity(
      createMockIdentity({ subject: "speech-outsider" }),
    );
    await other.mutation(api.users.updatePreferences, {
      preferences: { ttsEnabled: true },
    });
    expect(
      (
        await other.fetch("/tts", {
          method: "POST",
          body: JSON.stringify({ text: "secret" }),
        })
      ).status,
    ).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      (await client.action(api.tts.generateSpeech, { text: "secret" }))
        .audioBase64,
    ).toBe("AQID");
    await client.mutation(api.users.updatePreferences, {
      preferences: { ttsEnabled: false },
    });
    expect((await client.fetch("/tts?text=secret")).status).toBe(400);
    await expect(
      client.action(api.tts.generateSpeech, { text: "secret" }),
    ).rejects.toThrow(/disabled/);
  });
  it("bounds synthesis and provider errors without reflecting private provider text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("private provider echo", { status: 500 })),
    );
    await expect(
      synthesize("secret", "aura-asteria-en", 1, "key"),
    ).rejects.toThrow("Speech provider request failed (500)");
    await expect(
      synthesize("x".repeat(2001), "aura-asteria-en", 1, "key"),
    ).rejects.toThrow(/Invalid/);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(MAX_AUDIO_BYTES + 1), {
            headers: { "Content-Type": "audio/mpeg" },
          }),
      ),
    );
    await expect(
      synthesize("secret", "aura-asteria-en", 1, "key"),
    ).rejects.toThrow(/too large/);
  });
});
