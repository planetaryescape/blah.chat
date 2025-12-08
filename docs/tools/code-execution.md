# Code Execution Tool

## Overview

Run Python/JavaScript code in a secure sandboxed environment. Enables data analysis, algorithm testing, and file processing.

---

## Priority

**🟢 AMBITIOUS** - High complexity but very powerful.

---

## Use Cases

- Data analysis: "Analyze this CSV and show me trends"
- Visualization: "Create a chart of this data"
- Algorithm testing: "Run this code and show output"
- File processing: "Parse this JSON and extract X"
- Math/science: "Solve this differential equation"

---

## API Recommendations

### Option 1: E2B (Recommended)

**Best for:** Full-featured, AI-optimized sandboxes

| Feature | Value |
|---------|-------|
| Pricing | Free tier available, pay-as-you-go |
| Isolation | Firecracker microVMs (AWS Lambda tech) |
| Languages | Python, JavaScript, Ruby, C++, more |
| Spin-up | ~150ms |
| Persistence | ✅ Can persist between calls |

**Pros:**
- Purpose-built for AI code execution
- Open-source infrastructure
- Excellent security (microVM isolation)
- Python & JS SDKs

**Cons:**
- Cloud-dependent
- Cost at scale

```bash
E2B_API_KEY=e2b_...
```

**Usage:**
```typescript
import Sandbox from "@e2b/code-interpreter";

const sandbox = await Sandbox.create();
const result = await sandbox.runCode("print('Hello, World!')");
await sandbox.close();
```

---

### Option 2: Modal

**Best for:** Scalable Python workloads

| Feature | Value |
|---------|-------|
| Pricing | Pay per second of compute |
| Isolation | gVisor containers |
| Languages | Primarily Python |
| Scale | Thousands of concurrent sandboxes |
| Extra | GPU support |

**Pros:**
- Serverless, auto-scaling
- Great for ML/AI workloads
- GPU access
- Persistent storage

**Cons:**
- More complex setup
- Python-centric

```bash
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
```

---

### Option 3: Pyodide (Browser-based)

**Best for:** Lightweight, zero-cost Python execution

| Feature | Value |
|---------|-------|
| Pricing | **Free** (runs locally) |
| Isolation | WebAssembly sandbox |
| Languages | Python only |
| Libraries | numpy, pandas, matplotlib, etc. |

**Pros:**
- Free
- Runs in browser or Deno
- No external service needed
- Good library support

**Cons:**
- Python only
- Limited to WASM-compatible libraries
- Slower than native

```typescript
import { loadPyodide } from "pyodide";
const pyodide = await loadPyodide();
const result = await pyodide.runPythonAsync("1 + 1");
```

---

### Option 4: CodeSandbox SDK

**Best for:** Full development environments

| Feature | Value |
|---------|-------|
| Pricing | Commercial |
| Isolation | Cloud VMs |
| Languages | All (Node, Python, etc.) |
| Extra | Full IDE, live preview |

**Pros:**
- Complete dev environment
- Multiple languages
- File system access
- NPM/pip packages

**Cons:**
- More than code execution
- More expensive

---

## Recommendation

**For MVP: Pyodide** - Free, simple, covers most data analysis cases.

**For Production: E2B** - Best balance of features, security, and cost.

---

## Implementation Complexity

**🔴 HIGH** - Full day+ of work

- External API/WASM setup
- Security considerations
- Timeout handling
- Output parsing (stdout, stderr, images)
- State management (optional)

---

## Tool Schema

```typescript
inputSchema: z.object({
  code: z.string().describe("Code to execute"),
  language: z.enum(["python", "javascript"]).default("python"),
  timeout: z.number().optional().default(30).describe("Max seconds to run"),
  packages: z.array(z.string()).optional().describe("Packages to install"),
})
```

---

## Example Responses

```json
// Success
{
  "success": true,
  "language": "python",
  "stdout": "Hello, World!\n",
  "stderr": "",
  "returnValue": null,
  "executionTime": 0.124
}

// Success with visualization
{
  "success": true,
  "stdout": "",
  "images": [
    {
      "type": "png",
      "base64": "iVBORw0KGgoAAAANS..."
    }
  ]
}

// Error
{
  "success": false,
  "error": "NameError: name 'undefined_var' is not defined",
  "stderr": "Traceback (most recent call last)..."
}
```

---

## Tool Description

```
Execute Python or JavaScript code in a secure sandbox.

✅ USE FOR:
- Data analysis and visualization
- Mathematical calculations
- Algorithm implementation
- File parsing (JSON, CSV)
- Quick prototyping

❌ DO NOT USE FOR:
- Long-running processes (>30s)
- Network requests from code
- File system access outside sandbox
- System commands

Returns stdout, stderr, and any generated images.
```

---

## Security Considerations

1. **Timeout**: Always enforce execution timeout (30s default)
2. **Resource limits**: Cap memory and CPU usage
3. **Network**: Disable or restrict network access
4. **File system**: Sandbox file access
5. **Packages**: Whitelist allowed packages

---

## Implementation Outline (E2B)

```typescript
// convex/ai/tools/code-execution.ts
import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createCodeExecutionTool(ctx: ActionCtx) {
  return tool({
    description: `Execute Python/JavaScript code in a secure sandbox.

✅ USE FOR: Data analysis, visualization, calculations, file parsing
❌ DO NOT USE FOR: Long processes (>30s), network requests

Returns stdout, stderr, and generated images.`,

    inputSchema: z.object({
      code: z.string().describe("Code to execute"),
      language: z.enum(["python", "javascript"]).default("python"),
      timeout: z.number().optional().default(30),
    }),

    // @ts-ignore
    execute: async ({ code, language, timeout }) => {
      return await ctx.runAction(internal.tools.codeExecution.run, {
        code,
        language,
        timeout,
      });
    },
  });
}

// convex/tools/codeExecution.ts
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import Sandbox from "@e2b/code-interpreter";

export const run = internalAction({
  args: {
    code: v.string(),
    language: v.string(),
    timeout: v.number(),
  },
  handler: async (ctx, { code, language, timeout }) => {
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) throw new Error("E2B_API_KEY not configured");

    const sandbox = await Sandbox.create({ apiKey });

    try {
      const result = await sandbox.runCode(code, {
        timeout: timeout * 1000,
        language: language as "python" | "javascript",
      });

      return {
        success: true,
        stdout: result.logs.stdout.join(""),
        stderr: result.logs.stderr.join(""),
        results: result.results,
        images: result.results
          .filter((r) => r.type === "image")
          .map((r) => ({ type: r.type, base64: r.data })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
      };
    } finally {
      await sandbox.close();
    }
  },
});
```

---

## Environment Variables

```bash
# E2B
E2B_API_KEY=e2b_xxxxxxxxxx

# Modal
MODAL_TOKEN_ID=...
MODAL_TOKEN_SECRET=...
```

---

## UI Display

- **Icon:** `Code` or `Terminal` from lucide-react
- **Running:** "Executing code..."
- **Complete:** "Code executed successfully"
- **Expanded:** Show stdout/stderr, render images inline

---

## Testing Checklist

- [ ] Simple print: "Run: print('Hello')"
- [ ] Math: "Calculate factorial of 10 using Python"
- [ ] Data: "Analyze this list: [1,2,3,4,5]"
- [ ] Visualization: "Create a bar chart of [10, 20, 30]"
- [ ] Error handling: Syntax error in code
- [ ] Timeout: Infinite loop should timeout
