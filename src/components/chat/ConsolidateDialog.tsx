"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@/convex/_generated/dataModel";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { useMemo, useState } from "react";

type ConsolidationMode = "same-chat" | "new-chat";

interface ConsolidateDialogProps {
  open: boolean;
  comparisonGroupId: string;
  messages: Doc<"messages">[];
  onConfirm: (model: string, mode: ConsolidationMode) => void;
  onClose: () => void;
}

export function ConsolidateDialog({
  open,
  messages,
  onConfirm,
  onClose,
}: ConsolidateDialogProps) {
  const availableModels = Object.values(MODEL_CONFIG).filter((m) => !m.isLocal);
  const [selectedModel, setSelectedModel] = useState<string>(
    availableModels[0]?.id || "",
  );
  const [mode, setMode] = useState<ConsolidationMode>("same-chat");

  // Estimate input tokens (rough calculation)
  const estimatedTokens = useMemo(() => {
    const fullContent = messages.map((m) => m.content).join("\n\n");
    // Rough estimate: ~4 chars per token
    return Math.ceil(fullContent.length / 4);
  }, [messages]);

  const estimatedCost = (estimatedTokens / 1000) * 0.003; // Rough estimate

  const handleConfirm = () => {
    onConfirm(selectedModel, mode);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Consolidate Responses</DialogTitle>
          <DialogDescription>
            Synthesize all {messages.length} responses into one comprehensive
            answer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Consolidation mode</label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as ConsolidationMode)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="same-chat" id="same-chat" />
                <Label htmlFor="same-chat" className="cursor-pointer">
                  <div className="font-medium">Same chat</div>
                  <div className="text-xs text-muted-foreground">
                    Replace comparison with consolidated response
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new-chat" id="new-chat" />
                <Label htmlFor="new-chat" className="cursor-pointer">
                  <div className="font-medium">New chat</div>
                  <div className="text-xs text-muted-foreground">
                    Create separate conversation with consolidated response
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Which model should consolidate?
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Estimated input tokens:</span>
              <span className="font-mono">
                {estimatedTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated cost:</span>
              <span className="font-mono">${estimatedCost.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Consolidate with{" "}
            {availableModels.find((m) => m.id === selectedModel)?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
