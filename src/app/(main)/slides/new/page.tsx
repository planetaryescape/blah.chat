"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  SLIDES_OUTLINE_SYSTEM_PROMPT,
  buildUnifiedOutlinePrompt,
} from "@/convex/lib/prompts/operational/slidesOutline";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";

export default function NewSlidesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");

  const { showSlides } = useFeatureToggles();

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const createPresentation = useMutation(api.presentations.create);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const createConversation = useMutation(api.conversations.create);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const linkConversation = useMutation(api.presentations.linkConversation);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const sendMessage = useMutation(api.chat.sendMessage);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateStatus = useMutation(api.presentations.updateStatus);

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  const handleCreate = async () => {
    if (!input.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Use provided title or placeholder (will be auto-generated later)
      const presentationTitle = title.trim() || "Untitled Presentation";

      // 1. Create presentation record
      const presentationId = await createPresentation({
        title: presentationTitle,
      });

      // 2. Create conversation with slides system prompt
      const conversationId = await createConversation({
        model: "zai:glm-4.6",
        title: `Slides: ${presentationTitle}`,
        systemPrompt: SLIDES_OUTLINE_SYSTEM_PROMPT,
      });

      // 3. Link conversation to presentation
      await linkConversation({
        presentationId,
        conversationId,
      });

      // 4. Update presentation status
      await updateStatus({
        presentationId,
        status: "outline_generating",
      });

      // 5. Send initial message to generate outline (unified prompt)
      const userPrompt = buildUnifiedOutlinePrompt(input.trim());
      await sendMessage({
        conversationId,
        content: userPrompt,
        modelId: "zai:glm-4.6",
      });

      // 6. Redirect to outline editor
      router.push(`/slides/${presentationId}/outline`);
    } catch (error) {
      console.error("Error creating presentation:", error);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Presentation</h1>
          <p className="mt-2 text-muted-foreground">
            Generate professional slides with AI in seconds
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Presentation Details</CardTitle>
            <CardDescription>
              Describe your presentation and AI will create an outline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title Input (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Auto-generated from content"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from content
              </p>
            </div>

            {/* Unified Input */}
            <div className="space-y-2">
              <Label htmlFor="input">Describe your presentation</Label>
              <Textarea
                id="input"
                placeholder={`Enter a topic, paste a document, or provide an outline...

Examples:
• "Quarterly business review for Q4 2024"
• Paste your research paper or article
• Bullet-point outline of your talk`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                rows={12}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                AI will analyze your input and create a structured slide deck
              </p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={loading || !input.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Generate Outline"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
