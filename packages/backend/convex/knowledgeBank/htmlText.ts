import { Parser } from "htmlparser2";

/** Extract plain text for chunking, never HTML for insertion into a document. */
export function extractHtmlText(html: string): string {
  const parts: string[] = [];
  let skippedDepth = 0;
  const parser = new Parser(
    {
      onopentag(name) {
        if (skippedDepth > 0 || name === "script" || name === "style") {
          skippedDepth++;
        }
        if (skippedDepth === 0) parts.push(" ");
      },
      ontext(text) {
        if (skippedDepth === 0) parts.push(text);
      },
      onclosetag() {
        if (skippedDepth > 0) skippedDepth--;
        if (skippedDepth === 0) parts.push(" ");
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  return parts.join("").replace(/\s+/g, " ").trim();
}
