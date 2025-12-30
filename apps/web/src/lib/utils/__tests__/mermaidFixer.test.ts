import { describe, expect, it } from "vitest";
import { fixMermaidSyntax } from "../mermaidFixer";

describe("fixMermaidSyntax - valid code", () => {
  it("returns valid Mermaid code unchanged", () => {
    const valid = "graph LR\n    A[Start] --> B[End]";
    expect(fixMermaidSyntax(valid)).toBe(valid);
  });

  it("preserves already quoted labels", () => {
    const quoted = 'A --> B["/api/v1/users"]';
    expect(fixMermaidSyntax(quoted)).toBe(quoted);
  });

  it("preserves backtick quoted labels", () => {
    const backtick = 'A --> B["`/api/v1/users`"]';
    expect(fixMermaidSyntax(backtick)).toBe(backtick);
  });

  it("preserves single quoted labels", () => {
    const single = "A --> B['/api/v1/users']";
    expect(fixMermaidSyntax(single)).toBe(single);
  });
});

describe("fixMermaidSyntax - special characters", () => {
  it("quotes paths with forward slashes", () => {
    const input = "A --> B[/api/v1/users]";
    const expected = 'A --> B["/api/v1/users"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("quotes URLs with query parameters", () => {
    const input = "A --> B[/api/users?version=1]";
    const expected = 'A --> B["/api/users?version=1"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("quotes labels with ampersands", () => {
    const input = "A --> B[param1&param2]";
    const expected = 'A --> B["param1&param2"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("handles multiple special chars in one label", () => {
    const input = "A --> B[/api/v1/users?id=1&name=test]";
    const expected = 'A --> B["/api/v1/users?id=1&name=test"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("quotes labels with curly braces (JSON-like content)", () => {
    const input = 'A --> B[{"key": "value"}]';
    const expected = 'A --> B["{#quot;key#quot;: #quot;value#quot;}"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("quotes labels with colons", () => {
    const input = "A --> B[status: error]";
    const expected = 'A --> B["status: error"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("escapes nested quotes in JSON content", () => {
    const input = 'G[{"status": "error", "code": 404}]';
    const expected =
      'G["{#quot;status#quot;: #quot;error#quot;, #quot;code#quot;: 404}"]';
    expect(fixMermaidSyntax(input)).toBe(expected);
  });
});

describe("fixMermaidSyntax - real world examples", () => {
  it("fixes the URI versioning diagram", () => {
    const input = `graph LR
    A[URI Versioning] --> B[Version in path]
    A --> C[Version in header]
    A --> D[Version in query param]
    
    B --> B1[/api/v1/users]
    C --> C1[/api/users]
    D --> D1[/api/users?version=1]`;

    const expected = `graph LR
    A[URI Versioning] --> B[Version in path]
    A --> C[Version in header]
    A --> D[Version in query param]
    
    B --> B1["/api/v1/users"]
    C --> C1["/api/users"]
    D --> D1["/api/users?version=1"]`;

    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("fixes the HTTP status codes with JSON response diagram", () => {
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

    const expected = `graph TD
    E[Error] --> F[Standard HTTP Status Codes]
    F --> F1[200 OK]
    F --> F2[400 Bad Request]
    F --> F3[401 Unauthorized]
    F --> F4[403 Forbidden]
    F --> F5[404 Not Found]
    F --> F6[422 Unprocessable Entity]
    F --> F7[500 Internal Server Error]
    
    subgraph "Response Structure"
        G["{#quot;status#quot;: #quot;error#quot;, #quot;code#quot;: 404, #quot;message#quot;: #quot;Resource not found#quot;, #quot;timestamp#quot;: #quot;2023-12-30T10:30:00Z#quot;}"]
    end`;

    expect(fixMermaidSyntax(input)).toBe(expected);
  });
});

describe("fixMermaidSyntax - edge cases", () => {
  it("handles empty string", () => {
    expect(fixMermaidSyntax("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(fixMermaidSyntax(null as any)).toBe(null);
    expect(fixMermaidSyntax(undefined as any)).toBe(undefined);
  });

  it("preserves multiline labels with <br/>", () => {
    const input = 'A --> B["Line 1<br/>Line 2"]';
    expect(fixMermaidSyntax(input)).toBe(input);
  });

  it("handles mixed valid and invalid nodes", () => {
    const input = `A[Valid] --> B[/invalid/path]
    C[Also Valid] --> D[/another/path]`;

    const expected = `A[Valid] --> B["/invalid/path"]
    C[Also Valid] --> D["/another/path"]`;

    expect(fixMermaidSyntax(input)).toBe(expected);
  });

  it("preserves labels without special characters", () => {
    const input = "A[Simple Text] --> B[More Text]";
    expect(fixMermaidSyntax(input)).toBe(input);
  });
});
