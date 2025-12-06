# Model Prominence: Make Current Model Obvious

## Context

**t3.chat approach:** Model selector prominent in UI with current model clearly displayed

**Current blah.chat:** Model selector in ChatInput footer - not prominent enough

**Goal:** Move model display to header, add quick switcher, show capabilities contextually

---

## Implementation

### 1. Model Badge in Header

**File:** `src/app/(main)/chat/[conversationId]/page.tsx`

```typescript
import { ModelBadge } from "@/components/chat/ModelBadge";

export default function ChatPage({ params }: { params: { conversationId: string } }) {
  const conversation = useQuery(api.conversations.get, { id: params.conversationId });
  const [selectedModel, setSelectedModel] = useState(conversation?.model || DEFAULT_MODEL);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b shrink-0">
        <h1 className="text-lg font-semibold truncate flex-1">
          {conversation?.title || "New Chat"}
        </h1>

        {/* NEW: Model display */}
        <ModelBadge
          modelId={selectedModel}
          onClick={() => setQuickSwitcherOpen(true)}
        />

        <div className="flex items-center gap-2">
          {/* existing action buttons */}
        </div>
      </header>

      {/* Content */}
      <MessageList />
      <ChatInput />

      {/* Quick switcher modal */}
      <QuickModelSwitcher
        open={quickSwitcherOpen}
        onOpenChange={setQuickSwitcherOpen}
        value={selectedModel}
        onChange={setSelectedModel}
      />
    </div>
  );
}
```

---

### 2. ModelBadge Component

**File:** `src/components/chat/ModelBadge.tsx` (NEW)

```typescript
import { Button } from "@/components/ui/button";
import { getModelConfig } from "@/lib/ai/models";
import { ChevronDown, Sparkles, Zap, Eye } from "lucide-react";

export function ModelBadge({
  modelId,
  onClick,
}: {
  modelId: string;
  onClick?: () => void;
}) {
  const config = getModelConfig(modelId);
  if (!config) return null;

  const Icon = getModelIcon(config);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2 min-w-[180px]"
    >
      <Icon className="w-3 h-3" />
      <span className="truncate">{config.name}</span>
      {onClick && <ChevronDown className="w-3 h-3 ml-auto" />}
    </Button>
  );
}

function getModelIcon(config: ModelConfig) {
  if (config.supportsThinkingEffort) return Sparkles;
  if (config.capabilities.includes("vision")) return Eye;
  if (config.name.toLowerCase().includes("flash") || config.name.includes("Mini")) return Zap;
  return Sparkles;
}
```

---

### 3. Quick Model Switcher

**File:** `src/components/chat/QuickModelSwitcher.tsx` (NEW)

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import { getModelsByProvider } from "@/lib/ai/models";
import { Check } from "lucide-react";

export function QuickModelSwitcher({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (modelId: string) => void;
}) {
  const grouped = getModelsByProvider();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Model</DialogTitle>
        </DialogHeader>

        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList className="max-h-[400px]">
            {Object.entries(grouped).map(([provider, models]) => (
              <CommandGroup key={provider} heading={provider}>
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    onSelect={() => {
                      onChange(model.id);
                      onOpenChange(false);
                    }}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <ModelIcon model={model} />
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {model.capabilities.join(", ")}
                        </div>
                      </div>
                    </div>
                    {value === model.id && <Check className="w-4 h-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

**Add keyboard shortcut (⌘M):**

```typescript
// In useKeyboardShortcuts.ts
if (isMod && e.key === "m") {
  e.preventDefault();
  // Dispatch custom event to open switcher
  window.dispatchEvent(new CustomEvent("open-model-switcher"));
}

// In QuickModelSwitcher
useEffect(() => {
  const handler = () => setOpen(true);
  window.addEventListener("open-model-switcher", handler);
  return () => window.removeEventListener("open-model-switcher", handler);
}, []);
```

---

### 4. Model Feature Hints

**File:** `src/components/chat/ModelFeatureHint.tsx` (NEW)

```typescript
import { getModelConfig } from "@/lib/ai/models";
import { Image, Brain, FileText } from "lucide-react";

export function ModelFeatureHint({ modelId }: { modelId: string }) {
  const config = getModelConfig(modelId);
  if (!config) return null;

  const hints = [];

  if (config.capabilities.includes("vision")) {
    hints.push({ icon: Image, text: "Attach images for analysis" });
  }

  if (config.supportsThinkingEffort) {
    hints.push({ icon: Brain, text: "Extended reasoning enabled" });
  }

  if (config.contextWindow > 100000) {
    hints.push({
      icon: FileText,
      text: `${(config.contextWindow / 1000).toFixed(0)}k context window`,
    });
  }

  if (hints.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg text-xs">
      {hints.map((hint, i) => (
        <div key={i} className="flex items-center gap-1 text-muted-foreground">
          <hint.icon className="w-3 h-3" />
          {hint.text}
        </div>
      ))}
    </div>
  );
}
```

**Add to ChatInput footer:**

```typescript
// In ChatInput.tsx
<div className="flex items-center justify-between">
  <ModelFeatureHint modelId={selectedModel} />
  <KeyboardHints />
</div>
```

---

## Testing Checklist

- [ ] Model badge visible in header
- [ ] Click badge opens quick switcher
- [ ] ⌘M opens quick switcher
- [ ] Search filters models
- [ ] Selected model highlighted
- [ ] Model change updates badge immediately
- [ ] Feature hints show for vision/thinking models
- [ ] Comparison mode shows "Comparing N models" instead

---

## Critical Files

1. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ModelBadge.tsx` (NEW)
2. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/QuickModelSwitcher.tsx` (NEW)
3. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ModelFeatureHint.tsx` (NEW)
4. `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/(main)/chat/[conversationId]/page.tsx`
5. `/Users/bhekanik/code/planetaryescape/blah.chat/src/hooks/useKeyboardShortcuts.ts`

---

## Implementation Time: 3-4 hours
