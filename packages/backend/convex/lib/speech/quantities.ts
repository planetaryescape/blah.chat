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

/** Typed pronunciation only: never ask a model to infer numeric values or units. */
export function readQuantities(text: string): string {
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
