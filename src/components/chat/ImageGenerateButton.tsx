"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { analytics } from "@/lib/analytics";
import { useAction, useMutation } from "convex/react";
import { ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { QuickModelSwitcher } from "./QuickModelSwitcher";

interface ImageGenerateButtonProps {
  conversationId: Id<"conversations">;
  messageId?: Id<"messages">;
  initialPrompt?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "icon";
  iconOnly?: boolean;
}

export function ImageGenerateButton({
  conversationId,
  messageId,
  initialPrompt = "",
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: ImageGenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState(
    "google:gemini-3-pro-image",
  );
  const [thinkingEffort, setThinkingEffort] = useState<
    "low" | "medium" | "high"
  >("medium");

  const [isGenerating, setIsGenerating] = useState(false);

  // Filter to image generation models
  const imageModels = useMemo(
    () =>
      Object.values(MODEL_CONFIG).filter((m) =>
        m.capabilities.includes("image-generation"),
      ),
    [],
  );

  // Check if selected model supports thinking
  const selectedModelConfig = MODEL_CONFIG[selectedModel];
  const supportsThinking = !!selectedModelConfig?.reasoning;
  // @ts-ignore
  const sendMessage = useMutation(api.chat.sendMessage as any);

  const generateImage = useAction(
    (api as any)["generation/image"].generateImage,
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      // If no messageId, send as regular message first
      if (!messageId) {
        await sendMessage({
          conversationId,
          content: prompt.trim(),
          modelId: selectedModel,
        });
      } else {
        await generateImage({
          conversationId,
          messageId,
          prompt: prompt.trim(),
          model: selectedModel,
          thinkingEffort: supportsThinking ? thinkingEffort : undefined,
        });
      }

      analytics.track("feature_used", { feature: "image_gen" });

      setOpen(false);
      setPrompt("");
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If we have an initial prompt and no messageId, generate immediately
    if (initialPrompt.trim() && !messageId) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Sync initialPrompt when it changes
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={handleClick}>
          <ImageIcon className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} />
          {!iconOnly && "Generate Image"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Image with AI</DialogTitle>
          <DialogDescription>
            Describe the image you want to generate. Be specific for best
            results.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Image Description</Label>
            <Input
              id="prompt"
              placeholder="A serene mountain landscape at sunset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Image Model</Label>
            <QuickModelSwitcher
              currentModel={selectedModel}
              onSelectModel={setSelectedModel}
              open={false}
              onOpenChange={() => {}}
              mode="single"
            />
          </div>
          {supportsThinking && (
            <div className="space-y-2">
              <Label htmlFor="thinking-effort">Thinking Effort</Label>
              <Select
                value={thinkingEffort}
                onValueChange={(v) =>
                  setThinkingEffort(v as "low" | "medium" | "high")
                }
              >
                <SelectTrigger id="thinking-effort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Fast</SelectItem>
                  <SelectItem value="medium">Medium - Balanced</SelectItem>
                  <SelectItem value="high">High - Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
