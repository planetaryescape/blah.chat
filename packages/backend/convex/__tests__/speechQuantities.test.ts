import { describe, expect, it } from "vitest";
import { readQuantities } from "../lib/speech/quantities";

describe("math and currency pronunciation boundaries", () => {
  it.each([
    "Compute $3.050 + 2$.",
    "Compute $3 + 2$.",
    "Compute $$3.050 + 2$$.",
    "Compute $3.050$.",
    "Compute $3 + 2$3.",
    "Compute $3.050$3.",
    "Compute $3-2$3.",
  ])("retains unsupported mathematical notation without inventing dollars: %s", (source) => {
    expect(readQuantities(source)).toBe(source);
    expect(readQuantities(source)).not.toContain("dollars");
  });
  it("still reads ordinary prices and decimal precision outside math spans", () => {
    expect(readQuantities("Pay $3.050 and $-1.20.")).toBe(
      "Pay 3 point zero five zero dollars and minus 1 point two zero dollars.",
    );
    expect(readQuantities("Compare $3 + 2$, then pay $3.050.")).toBe(
      "Compare $3 + 2$, then pay 3 point zero five zero dollars.",
    );
    expect(readQuantities("Pay $3.050, then compute $3 + 2$.")).toBe(
      "Pay 3 point zero five zero dollars, then compute $3 + 2$.",
    );
    expect(readQuantities("Pay $+3.050, then compute $3 + 2$.")).toBe(
      "Pay plus 3 point zero five zero dollars, then compute $3 + 2$.",
    );
    expect(
      readQuantities("Pay $3.050, $1.00 and $-1.20, then compute $3 + 2$."),
    ).toBe(
      "Pay 3 point zero five zero dollars, 1 point zero zero dollars and minus 1 point two zero dollars, then compute $3 + 2$.",
    );
  });
});
