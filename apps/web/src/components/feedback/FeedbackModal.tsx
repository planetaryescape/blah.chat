"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bug,
  Camera,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "bug" | "feature" | "praise" | "other";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const feedbackTypeConfig: Record<
  FeedbackType,
  { label: string; icon: React.ReactNode; description: string }
> = {
  bug: {
    label: "Report a Bug",
    icon: <Bug className="h-4 w-4" />,
    description: "Something isn't working as expected",
  },
  feature: {
    label: "Feature Request",
    icon: <Lightbulb className="h-4 w-4" />,
    description: "I'd like to suggest a new feature",
  },
  praise: {
    label: "Share Praise",
    icon: <Heart className="h-4 w-4" />,
    description: "Something I really love about this app",
  },
  other: {
    label: "General Feedback",
    icon: <MessageCircle className="h-4 w-4" />,
    description: "Other thoughts or comments",
  },
};

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);
  const createFeedback = useMutation(api.feedback.createFeedback);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [whatTheyDid, setWhatTheyDid] = useState("");
  const [whatTheySaw, setWhatTheySaw] = useState("");
  const [whatTheyExpected, setWhatTheyExpected] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFeedbackType("bug");
    setDescription("");
    setWhatTheyDid("");
    setWhatTheySaw("");
    setWhatTheyExpected("");
    setIncludeScreenshot(true);
  }, []);

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    try {
      console.log("[Feedback] Starting screenshot capture...");
      // Use html-to-image which supports modern CSS color functions
      const { toPng } = await import("html-to-image");

      // Hide the modal temporarily for screenshot
      const dialogOverlay = document.querySelector(
        '[data-slot="dialog-overlay"]',
      );
      const dialogContent = document.querySelector(
        '[data-slot="dialog-content"]',
      );

      if (dialogOverlay)
        (dialogOverlay as HTMLElement).style.visibility = "hidden";
      if (dialogContent)
        (dialogContent as HTMLElement).style.visibility = "hidden";

      // Small delay to ensure modal is hidden
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(document.body, {
        cacheBust: true,
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        // Filter out dialog elements from the screenshot
        filter: (node) => {
          if (node instanceof Element) {
            const slot = node.getAttribute("data-slot");
            if (slot === "dialog-overlay" || slot === "dialog-content") {
              return false;
            }
            // Also filter by role for broader coverage
            const role = node.getAttribute("role");
            if (role === "dialog" || role === "alertdialog") {
              return false;
            }
          }
          return true;
        },
      });

      console.log(
        "[Feedback] Screenshot captured, data URL length:",
        dataUrl.length,
      );

      // Restore modal
      if (dialogOverlay) (dialogOverlay as HTMLElement).style.visibility = "";
      if (dialogContent) (dialogContent as HTMLElement).style.visibility = "";

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      console.log("[Feedback] Blob created, size:", blob.size, "bytes");

      try {
        // Upload to Convex storage
        const uploadUrl = await generateUploadUrl();
        console.log("[Feedback] Got upload URL, uploading...");

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });
        const result = await uploadResponse.json();
        console.log("[Feedback] Upload complete, storageId:", result.storageId);
        return result.storageId;
      } catch (error) {
        console.error("[Feedback] Failed to upload screenshot:", error);
        return null;
      }
    } catch (error) {
      console.error("[Feedback] Failed to capture screenshot:", error);
      return null;
    }
  }, [generateUploadUrl]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please describe your feedback");
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotStorageId: string | undefined;

      if (includeScreenshot) {
        toast.info("Capturing screenshot...");
        const storageId = await captureScreenshot();
        if (storageId) {
          screenshotStorageId = storageId;
          toast.success("Screenshot captured!");
        } else {
          toast.warning("Screenshot capture failed, submitting without it");
        }
      }

      await createFeedback({
        feedbackType,
        description: description.trim(),
        page: pathname,
        whatTheyDid:
          feedbackType === "bug" && whatTheyDid.trim()
            ? whatTheyDid.trim()
            : undefined,
        whatTheySaw:
          feedbackType === "bug" && whatTheySaw.trim()
            ? whatTheySaw.trim()
            : undefined,
        whatTheyExpected:
          feedbackType === "bug" && whatTheyExpected.trim()
            ? whatTheyExpected.trim()
            : undefined,
        screenshotStorageId: screenshotStorageId as any,
      });

      toast.success("Thank you for your feedback!");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDescriptionLabel = () => {
    switch (feedbackType) {
      case "bug":
        return "What's the issue?";
      case "feature":
        return "What feature would you like?";
      case "praise":
        return "What do you love?";
      default:
        return "What's on your mind?";
    }
  };

  const getDescriptionPlaceholder = () => {
    switch (feedbackType) {
      case "bug":
        return "Describe the bug you encountered...";
      case "feature":
        return "Describe the feature you'd like to see...";
      case "praise":
        return "Tell us what you enjoy about the app...";
      default:
        return "Share your thoughts...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Give Feedback</DialogTitle>
          <DialogDescription>
            Help us improve your experience. Your feedback is valuable to us.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info (read-only) */}
          {user && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              <p>
                <span className="font-medium">From:</span> {user.name}
                {user.email && ` (${user.email})`}
              </p>
              <p>
                <span className="font-medium">Page:</span> {pathname}
              </p>
            </div>
          )}

          {/* Feedback Type Selector */}
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <Select
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as FeedbackType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(feedbackTypeConfig) as [
                    FeedbackType,
                    typeof feedbackTypeConfig.bug,
                  ][]
                ).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {feedbackTypeConfig[feedbackType].description}
            </p>
          </div>

          {/* Description (Required) */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {getDescriptionLabel()}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder={getDescriptionPlaceholder()}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Bug-specific fields */}
          {feedbackType === "bug" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="whatTheyDid">What were you trying to do?</Label>
                <Textarea
                  id="whatTheyDid"
                  placeholder="I was trying to..."
                  value={whatTheyDid}
                  onChange={(e) => setWhatTheyDid(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatTheySaw">What happened?</Label>
                <Textarea
                  id="whatTheySaw"
                  placeholder="I saw..."
                  value={whatTheySaw}
                  onChange={(e) => setWhatTheySaw(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatTheyExpected">What did you expect?</Label>
                <Textarea
                  id="whatTheyExpected"
                  placeholder="I expected..."
                  value={whatTheyExpected}
                  onChange={(e) => setWhatTheyExpected(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Screenshot toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="screenshot" className="cursor-pointer">
                Include screenshot
              </Label>
            </div>
            <Switch
              id="screenshot"
              checked={includeScreenshot}
              onCheckedChange={setIncludeScreenshot}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
