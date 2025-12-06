# Dynamic Empty State: Model-Specific Prompts

## Context

**Current:** Static example questions regardless of selected model

**Goal:** Show contextual prompts based on model capabilities
- Thinking models → reasoning prompts
- Vision models → image analysis prompts
- Fast models → speed-focused prompts

---

## Implementation

### 1. Prompt Database

**File:** `src/lib/prompts/examplePrompts.ts` (NEW)

```typescript
export const EXAMPLE_PROMPTS = {
  thinking: [
    "Prove that there are infinitely many prime numbers",
    "Design a distributed caching system for 1M requests/sec",
    "Analyze the game theory of the prisoner's dilemma",
    "Debug this complex race condition in my code",
  ],
  vision: [
    "Analyze this architectural diagram and suggest improvements",
    "Compare these two product screenshots",
    "Extract text from this handwritten note",
    "Identify all UI/UX issues in this mockup",
  ],
  fast: [
    "Summarize this article in 3 bullet points",
    "Generate 10 creative taglines for my product",
    "What's the capital of Azerbaijan?",
    "Fix this syntax error quickly",
  ],
  general: [
    "Explain quantum computing to a 10-year-old",
    "Write a Python script to analyze CSV data",
    "What are the key trends in AI for 2025?",
    "Help me brainstorm ideas for my startup",
  ],
};

export function getPromptsForModel(modelId: string): string[] {
  const config = getModelConfig(modelId);
  if (!config) return EXAMPLE_PROMPTS.general;

  if (config.supportsThinkingEffort || config.capabilities.includes("thinking")) {
    return EXAMPLE_PROMPTS.thinking;
  }

  if (config.capabilities.includes("vision")) {
    return EXAMPLE_PROMPTS.vision;
  }

  if (
    config.name.toLowerCase().includes("flash") ||
    config.name.toLowerCase().includes("mini") ||
    config.name.toLowerCase().includes("fast")
  ) {
    return EXAMPLE_PROMPTS.fast;
  }

  return EXAMPLE_PROMPTS.general;
}
```

---

### 2. Update EmptyScreen Component

**File:** `src/components/chat/EmptyScreen.tsx`

```typescript
import { getPromptsForModel } from "@/lib/prompts/examplePrompts";

export function EmptyScreen({
  onClick,
  selectedModel, // NEW: Accept model as prop
}: {
  onClick: (value: string) => void;
  selectedModel: string;
}) {
  const prompts = getPromptsForModel(selectedModel);
  const [activeCategory, setActiveCategory] = useState<string>("Suggested");

  const questionsByCategory: Record<string, string[]> = {
    Suggested: prompts, // Model-specific prompts
    Explore: EXAMPLE_PROMPTS.general.slice(0, 4),
    Code: [
      "Debug this TypeScript error",
      "Optimize this React component",
      "Explain async/await in JavaScript",
      "Review this API design",
    ],
    Learn: [
      "How does transformer architecture work?",
      "Explain quantum entanglement simply",
      "What is the SOLID principle?",
      "How do neural networks learn?",
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full p-8"
    >
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        How can I help you?
      </h2>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6">
        {Object.keys(questionsByCategory).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="grid gap-3 w-full max-w-2xl">
        {questionsByCategory[activeCategory].map((question, index) => (
          <motion.button
            key={question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onClick(question)}
            className="text-left p-4 rounded-lg border bg-background/50 hover:bg-background transition-colors"
          >
            {question}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
```

**Pass selectedModel from parent:**

```typescript
// In MessageList.tsx or chat page
{messages.length === 0 && (
  <EmptyScreen
    onClick={handlePromptClick}
    selectedModel={selectedModel}
  />
)}
```

---

## Testing Checklist

- [ ] Select thinking model → reasoning prompts appear
- [ ] Select vision model → image analysis prompts appear
- [ ] Select fast model → speed-focused prompts appear
- [ ] Switch model → prompts update immediately
- [ ] Category tabs still work
- [ ] Animations smooth

---

## Critical Files

1. `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/prompts/examplePrompts.ts` (NEW)
2. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/EmptyScreen.tsx`
3. `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/ai/models.ts`

---

## Implementation Time: 2-3 hours
