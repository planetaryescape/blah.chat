/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { getTTSUrl } from "../ttsUtils";

describe("getTTSUrl", () => {
  it("always targets the app /tts route", () => {
    const url = getTTSUrl("hello world", "aura-luna-en", 1.25);

    expect(url).toBe(
      "http://localhost/tts?text=hello+world&voice=aura-luna-en&speed=1.25",
    );
  });
});
