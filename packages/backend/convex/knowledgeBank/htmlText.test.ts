import { describe, expect, it } from "vitest";
import { extractHtmlText } from "./htmlText";

describe("knowledge bank plain-text extraction", () => {
  it.each([
    [
      "<p>Required beginning</p><SCRIPT>secret();</SCRIPT ><p>Required ending.</p>",
      "Required beginning Required ending.",
    ],
    [
      "<p>Before</p><StYlE>.private { color: red }</sTyLe\n ><p>After.</p>",
      "Before After.",
    ],
    [
      "<div>Before<script><script>hidden</script>Visible ending.</div>",
      "Before Visible ending.",
    ],
    [
      "<div>Before<style><style>hidden</style>Visible ending.</div>",
      "Before Visible ending.",
    ],
    ["<p>Keep me</p><script>unclosed private text", "Keep me"],
    ["<p>Keep me</p><style>unclosed private text", "Keep me"],
    [
      "<p onclick='private()'>First <b>bold</b></p><!-- private --><img src=x onerror='private()'><p>Last.</p>",
      "First bold Last.",
    ],
    [
      "<div><p>Broken <b>markup</div><p>Required ending.",
      "Broken markup Required ending.",
    ],
    ["<p>A &amp; B &lt; C. &#169;</p>", "A & B < C. ©"],
    [
      "Ordinary text: 2 < 3 and 5 > 4. Required ending.",
      "Ordinary text: 2 < 3 and 5 > 4. Required ending.",
    ],
    [
      "<p>&lt;img src=x onerror=alert(1)&gt;</p>",
      "<img src=x onerror=alert(1)>",
    ],
  ])("extracts text without treating markup as a regex: %s", (html, text) => {
    expect(extractHtmlText(html)).toBe(text);
  });
});
