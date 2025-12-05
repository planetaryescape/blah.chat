"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { ComparisonModelSelector } from "./ComparisonModelSelector";

interface ComparisonTriggerProps {
  onStartComparison: (models: string[]) => void;
  isActive: boolean;
}

export function ComparisonTrigger({
  onStartComparison,
  isActive,
}: ComparisonTriggerProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = (models: string[]) => {
    onStartComparison(models);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant={isActive ? "default" : "ghost"}
          disabled={isActive}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Compare Models</DialogTitle>
          <DialogDescription>
            Select 2-4 models to compare their responses side-by-side.
          </DialogDescription>
        </DialogHeader>
        <ComparisonModelSelector
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
