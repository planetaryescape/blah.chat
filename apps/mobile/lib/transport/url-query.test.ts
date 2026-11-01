import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const routerRequire = createRequire(
  require.resolve("expo-router/package.json"),
);
const queryString = routerRequire("query-string");

describe("Expo Router query strings", () => {
  it("decodes deep link parameters with the patched URI decoder", () => {
    expect(queryString.parse("q=tea%20%26%20coffee&tag=one&tag=two")).toEqual({
      q: "tea & coffee",
      tag: ["one", "two"],
    });
  });

  it("preserves parameters when building and parsing a deep link", () => {
    const params = { q: "tea & coffee", tag: ["one", "two"] };
    expect(queryString.parse(queryString.stringify(params))).toEqual(params);
  });
});
