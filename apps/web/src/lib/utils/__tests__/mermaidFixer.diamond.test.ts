import { describe, expect, it } from "vitest";
import { fixMermaidSyntax } from "../mermaidFixer";

describe("fixMermaidSyntax - JSON diamond shape fix", () => {
  it("converts [{...}] diamond with JSON to quoted rectangle", () => {
    const input = 'G[{"status": "error"}]';
    const expected = 'G["{#quot;status#quot;: #quot;error#quot;}"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("handles complex JSON in diamond shape", () => {
    const input =
      'G[{"status": "error", "code": 404, "message": "Resource not found", "timestamp": "2023-12-30T10:30:00Z"}]';
    const expected =
      'G["{#quot;status#quot;: #quot;error#quot;, #quot;code#quot;: 404, #quot;message#quot;: #quot;Resource not found#quot;, #quot;timestamp#quot;: #quot;2023-12-30T10:30:00Z#quot;}"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("fixes the complete HTTP status diagram", () => {
    const input = `graph TD
    E[Error] --> F[Standard HTTP Status Codes]
    F --> F1[200 OK]
    F --> F2[400 Bad Request]
    F --> F3[401 Unauthorized]
    F --> F4[403 Forbidden]
    F --> F5[404 Not Found]
    F --> F6[422 Unprocessable Entity]
    F --> F7[500 Internal Server Error]
    
    subgraph "Response Structure"
        G[{"status": "error", "code": 404, "message": "Resource not found", "timestamp": "2023-12-30T10:30:00Z"}]
    end`;

    const result = fixMermaidSyntax(input);

    // Should convert the diamond shape to a quoted rectangle with #quot; entities
    expect(result).toContain('G["{#quot;status#quot;');
    expect(result).not.toContain('G[{"status"');
  });
});
