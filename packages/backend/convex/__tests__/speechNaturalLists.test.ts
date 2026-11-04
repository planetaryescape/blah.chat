import { describe, expect, it } from "vitest";
import { prepareDeterministic } from "../lib/speech/prepare";

describe("natural list narration", () => {
  it("removes generated labels while preserving list content and membership", async () => {
    const source = [
      "- Parent list item literally",
      "  - Child",
      "7. Seven",
      "8. Eight",
      "- [x] Checked",
      "- [ ] Unchecked",
      "- Say Item 7 and list item literally.",
      "",
      "Final sentence.",
    ].join("\n");

    const { narration } = await prepareDeterministic(source);
    const listSegments = narration.segments.filter(
      (segment) => segment.kind === "list",
    );
    const itemText = (listItemId: string) =>
      listSegments
        .filter((segment) => segment.listItemId === listItemId)
        .map((segment) => segment.text)
        .join("");

    expect(narration.segments.map((segment) => segment.text)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(?:List item|Item \d+|Nested list level)\. /),
      ]),
    );
    expect(narration.version).toBe("2");
    expect(
      narration.segments.every((segment) =>
        segment.id.startsWith("speech-v2:"),
      ),
    ).toBe(true);
    const itemIds = [
      ...new Set(
        listSegments
          .map((segment) => segment.listItemId)
          .filter((id): id is string => id !== undefined),
      ),
    ];
    expect(itemIds).toHaveLength(7);
    expect(itemIds.map(itemText)).toEqual([
      "Parent list item literally",
      "Child",
      "7. Seven",
      "8. Eight",
      "Checked. Checked",
      "Unchecked. Unchecked",
      "Say Item 7 and list item literally.",
    ]);
    const sourceItems = listSegments.filter(
      (segment) => segment.role === "source",
    );
    expect(sourceItems.map((segment) => segment.text)).toEqual([
      "Parent list item literally",
      "Child",
      "Seven",
      "Eight",
      "Checked",
      "Unchecked",
      "Say Item 7 and list item literally.",
    ]);
    for (const segment of sourceItems) {
      expect(source.slice(segment.sourceStart, segment.sourceEnd)).toContain(
        segment.text,
      );
    }
    expect(
      listSegments
        .filter((segment) => segment.role === "detail")
        .map((segment) => segment.text),
    ).toEqual(["7. ", "8. ", "Checked. ", "Unchecked. "]);
    expect(
      itemIds.map(
        (id) =>
          listSegments.find((segment) => segment.listItemId === id)?.listDepth,
      ),
    ).toEqual([1, 2, 1, 1, 1, 1, 1]);
    expect(
      listSegments.filter((segment) => segment.text === "Checked. "),
    ).toHaveLength(1);
    expect(
      listSegments.filter((segment) => segment.text === "Unchecked. "),
    ).toHaveLength(1);
    expect(listSegments.every((segment) => segment.text.length > 0)).toBe(true);
    expect(narration.segments.at(-1)?.text).toBe("Final sentence.");
    expect(narration.segments.at(-1)?.sourceEnd).toBe(source.length);
  });

  it("keeps empty, nested-only, loose, tabbed, and repeated items source-mapped", async () => {
    const source =
      "- Parent\r\n  - Nested-only child\r\n- Same 😀\tvalue\r\n  continuation\tvalue\r\n\r\n  Loose paragraph.\r\n- Same 😀\tvalue\r\n  continuation\tvalue\r\n-\r\n- [x]\r\n\r\nFinal sentence.";
    const { narration } = await prepareDeterministic(source);
    const spoken = narration.segments.map((segment) => segment.text);
    const sourceSegments = narration.segments.filter(
      (segment) => segment.role === "source" && segment.kind === "list",
    );

    expect(spoken).toContain("Parent");
    expect(spoken).toContain("Nested-only child");
    expect(
      spoken.filter(
        (text) => text === "Same 😀    value\ncontinuation    value",
      ),
    ).toHaveLength(2);
    expect(spoken).toContain("Loose paragraph.");
    expect(spoken.filter((text) => text === "Checked. ")).toHaveLength(1);
    expect(spoken).not.toContain("");
    expect(sourceSegments).toHaveLength(5);
    const sameItems = sourceSegments.filter((segment) =>
      segment.text.startsWith("Same 😀"),
    );
    expect(sameItems).toHaveLength(2);
    expect(new Set(sameItems.map((segment) => segment.listItemId)).size).toBe(
      2,
    );
    expect(sameItems.map((segment) => segment.sourceStart)).toEqual([
      source.indexOf("Same 😀"),
      source.lastIndexOf("Same 😀"),
    ]);
    expect(sameItems.map((segment) => segment.sourceEnd)).toEqual([
      source.indexOf("continuation\tvalue") + "continuation\tvalue".length,
      source.lastIndexOf("continuation\tvalue") + "continuation\tvalue".length,
    ]);
    expect(
      sourceSegments.map((segment) => [segment.sourceStart, segment.sourceEnd]),
    ).toEqual([
      [source.indexOf("Parent"), source.indexOf("- Nested-only child")],
      [
        source.indexOf("Nested-only child"),
        source.indexOf("Nested-only child") + "Nested-only child".length,
      ],
      [
        source.indexOf("Same 😀"),
        source.indexOf("continuation\tvalue") + "continuation\tvalue".length,
      ],
      [
        source.indexOf("Loose paragraph."),
        source.indexOf("Loose paragraph.") + "Loose paragraph.".length,
      ],
      [
        source.lastIndexOf("Same 😀"),
        source.lastIndexOf("continuation\tvalue") +
          "continuation\tvalue".length,
      ],
    ]);
    expect(narration.segments.at(-1)).toMatchObject({
      text: "Final sentence.",
      sourceStart: source.indexOf("Final sentence."),
      sourceEnd: source.length,
    });
  });

  it.each([
    "\n",
    "\r\n",
  ])("retains task state and all continuation/child content with exact source spans (%j)", async (newline) => {
    const source = [
      "- [x]",
      "  Checked continuation 😀",
      "- [ ]",
      "  Unchecked continuation 😀",
      "- [x]",
      "  - Nested task child",
      "",
      "Author literal [x] remains.",
      "",
      "Final sentence.",
    ].join(newline);
    const { narration } = await prepareDeterministic(source);
    const listSegments = narration.segments.filter(
      (segment) => segment.kind === "list",
    );
    const sourceSegments = listSegments.filter(
      (segment) => segment.role === "source",
    );
    const bodies = sourceSegments.map((segment) => segment.text);

    expect(
      listSegments
        .filter((segment) => segment.role === "detail")
        .map((segment) => segment.text),
    ).toEqual(["Checked. ", "Unchecked. ", "Checked. "]);
    expect(bodies).toEqual([
      "Checked continuation 😀",
      "Unchecked continuation 😀",
      "Nested task child",
    ]);
    expect(
      new Set(sourceSegments.map((segment) => segment.listItemId)).size,
    ).toBe(3);
    expect(sourceSegments.map((segment) => segment.listDepth)).toEqual([
      1, 1, 2,
    ]);
    expect(
      sourceSegments.map((segment) => [segment.sourceStart, segment.sourceEnd]),
    ).toEqual([
      [
        source.indexOf("Checked continuation 😀"),
        source.indexOf("Checked continuation 😀") +
          "Checked continuation 😀".length,
      ],
      [
        source.indexOf("Unchecked continuation 😀"),
        source.indexOf("Unchecked continuation 😀") +
          "Unchecked continuation 😀".length,
      ],
      [
        source.indexOf("Nested task child"),
        source.indexOf("Nested task child") + "Nested task child".length,
      ],
    ]);
    const allSpeech = narration.segments
      .map((segment) => segment.text)
      .join(" ");
    const listSpeech = listSegments.map((segment) => segment.text).join(" ");
    expect(listSpeech).not.toMatch(/\[[ xX]\]/);
    expect(allSpeech).toContain("Author literal [x] remains.");
    expect(narration.segments.at(-1)).toMatchObject({
      text: "Final sentence.",
      sourceStart: source.indexOf("Final sentence."),
      sourceEnd: source.length,
    });
  });
});
