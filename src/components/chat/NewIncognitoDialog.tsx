"use client";

import { Ghost, Search, Sparkles, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface NewIncognitoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewIncognitoDialog({
  open,
  onOpenChange,
}: NewIncognitoDialogProps) {
  const [enableReadTools, setEnableReadTools] = useState(true);
  const [applyCustomInstructions, setApplyCustomInstructions] = useState(true);
  const [autoDeleteTimeout, setAutoDeleteTimeout] = useState("30");
  const [isCreating, setIsCreating] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex mutation
  const createConversation = useMutation(api.conversations.create);
  const router = useRouter();

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const id = await createConversation({
        model: DEFAULT_MODEL_ID,
        isIncognito: true,
        incognitoSettings: {
          enableReadTools,
          applyCustomInstructions,
          inactivityTimeoutMinutes:
            autoDeleteTimeout === "none"
              ? undefined
              : Number(autoDeleteTimeout),
        },
      });
      router.push(`/chat/${id}`);
      onOpenChange(false);
      toast.success("Incognito chat started");

      // Reset state
      setEnableReadTools(true);
      setApplyCustomInstructions(true);
      setAutoDeleteTimeout("30");
    } catch (error) {
      console.error("Failed to create incognito chat:", error);
      toast.error("Failed to create incognito chat");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ghost className="size-5 text-violet-400" />
            New Incognito Chat
          </DialogTitle>
          <DialogDescription>
            Ephemeral conversation. No memories saved. Auto-deletes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read Tools Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="read-tools"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Search className="size-4 text-muted-foreground" />
                Search your data
              </Label>
              <p className="text-xs text-muted-foreground">
                Access notes, files, and tasks
              </p>
            </div>
            <Switch
              id="read-tools"
              checked={enableReadTools}
              onCheckedChange={setEnableReadTools}
            />
          </div>

          {/* Custom Instructions Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="custom-instructions"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Sparkles className="size-4 text-muted-foreground" />
                Custom instructions
              </Label>
              <p className="text-xs text-muted-foreground">
                Apply your personalization settings
              </p>
            </div>
            <Switch
              id="custom-instructions"
              checked={applyCustomInstructions}
              onCheckedChange={setApplyCustomInstructions}
            />
          </div>

          {/* Timeout Selector */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Timer className="size-4 text-muted-foreground" />
                Auto-delete after
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactivity timeout
              </p>
            </div>
            <Select
              value={autoDeleteTimeout}
              onValueChange={setAutoDeleteTimeout}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="none">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            <Ghost className="size-4 mr-2" />
            {isCreating ? "Starting..." : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
