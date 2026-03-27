export const DOCUMENT_EXTRACTION_PROMPT = `
Extract ALL text content from this document.

Rules:
- Extract text EXACTLY as it appears
- Preserve document structure (headings, lists, tables)
- For tables, use markdown table format
- For code blocks, wrap in triple backticks
- Do NOT summarize or interpret - extract verbatim

Output the extracted text directly, no preamble.
`;

export function buildPdfPageExtractionPrompt(
  pageNum: number,
  totalPages: number,
) {
  return `
Extract ALL text content from page ${pageNum} of ${totalPages} of this PDF document.

Rules:
- Extract text EXACTLY as it appears (preserve formatting where possible)
- Include headers, footers, captions, table content
- If the page is blank or has no text, respond with "[BLANK PAGE]"
- Do NOT summarize or interpret - extract verbatim
- For tables, preserve structure using markdown table format
- For code blocks, wrap in triple backticks

Output the extracted text directly, no preamble.
`;
}
