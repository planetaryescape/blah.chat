const DIGITS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

function readPlainQuantities(text: string): string {
  return text
    .replace(
      /\bv(\d+(?:\.\d+)+)\b/g,
      (_source, version: string) =>
        `v ${version
          .split(".")
          .map((part) =>
            [...part].map((digit) => DIGITS[Number(digit)]).join(" "),
          )
          .join(" dot ")}`,
    )
    .replace(
      /\bQ([1-4])\b/g,
      (_source, quarter: string) => `Q ${DIGITS[Number(quarter)]}`,
    )
    .replace(
      /(?<![\w.])([+-]?)([$£€]?)([+-]?)(\d+(?:,\d{3})*)(?:\.(\d+))?(%?)(?!\w|\.\d)/g,
      (
        source,
        before: string,
        currency: string,
        after: string,
        integer: string,
        fraction: string | undefined,
        percent: string,
        offset: number,
        input: string,
      ) => {
        // Dates, ranges, ratios, and phone numbers need context; leave them alone.
        const prefix = input.slice(0, offset);
        const suffix = input.slice(offset + source.length);
        if (
          /\/$|\d-$/.test(prefix) ||
          /^\/|^-\d/.test(suffix) ||
          (currency === "$" && suffix.startsWith("$")) ||
          (before && after)
        )
          return source;
        const sign = before || after;
        if (!fraction && !currency && !percent && !sign) return source;
        const whole = /^0\d/.test(integer)
          ? [...integer].map((digit) => DIGITS[Number(digit)]).join(" ")
          : integer;
        const decimal =
          fraction === undefined
            ? ""
            : ` point ${[...fraction].map((digit) => DIGITS[Number(digit)]).join(" ")}`;
        const unit =
          currency === "$"
            ? " dollars"
            : currency === "£"
              ? " pounds"
              : currency === "€"
                ? " euros"
                : "";
        return `${sign === "-" ? "minus " : sign === "+" ? "plus " : ""}${whole}${decimal}${unit}${percent ? " percent" : ""}`;
      },
    );
}

/** Typed pronunciation only; dollar-delimited math must never acquire currency units. */
export function readQuantities(text: string): string {
  let cursor = 0;
  let spoken = "";
  for (const match of text.matchAll(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g)) {
    const end = match.index + match[0].length;
    // A dollar directly before another price is a currency opener, not a math closer.
    if (!match[0].startsWith("$$") && /^[+-]?\d/.test(text.slice(end)))
      continue;
    spoken += readPlainQuantities(text.slice(cursor, match.index)) + match[0];
    cursor = end;
  }
  return spoken + readPlainQuantities(text.slice(cursor));
}
