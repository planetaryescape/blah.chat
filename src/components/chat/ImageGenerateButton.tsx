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
import { analytics } from "@/lib/analytics";
import { useAction, useMutation } from "convex/react";
import { ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

  const [isGenerating, setIsGenerating] = useState(false);
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
          modelId: "google:gemini-2.0-flash-exp", // Default image gen model
        });
      } else {
        await generateImage({
          conversationId,
          messageId,
          prompt: prompt.trim(),
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
