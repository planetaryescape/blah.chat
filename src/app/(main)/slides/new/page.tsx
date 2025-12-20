"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { TemplateUpload } from "@/components/slides/TemplateUpload";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  SLIDES_OUTLINE_ENHANCE_SYSTEM_PROMPT,
  SLIDES_OUTLINE_PARSE_SYSTEM_PROMPT,
  SLIDES_OUTLINE_SYSTEM_PROMPT,
  buildEnhanceOutlinePrompt,
  buildParseOutlinePrompt,
} from "@/convex/lib/prompts/operational/slidesOutline";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  FileIcon,
  Loader2,
  Mic,
  Palette,
  PenTool,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export default function NewSlidesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [slideStyle, setSlideStyle] = useState<"wordy" | "illustrative">(
    "illustrative",
  );
  const [inputMode, setInputMode] = useState<"prompt" | "outline">("prompt");
  const [enhanceOutline, setEnhanceOutline] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<Id<"designTemplates"> | null>(null);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showSlides, isLoading } = useFeatureToggles();

  // Handle document upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const allowedTypes = [
        "text/plain",
        "text/markdown",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Unsupported file type. Please use TXT, MD, PDF, or DOCX.");
        return;
      }

      if (file.type === "text/plain" || file.type === "text/markdown") {
        const text = await file.text();
        setInput(text);
        setUploadedFileName(file.name);
        toast.success(`Loaded ${file.name}`);
        return;
      }

      if (file.type === "application/pdf") {
        toast.info(
          "PDF upload coming soon. Please copy-paste the text content for now.",
        );
        return;
      }

      if (file.type.includes("wordprocessingml")) {
        toast.info(
          "DOCX upload coming soon. Please copy-paste the text content for now.",
        );
        return;
      }
    },
    [],
  );

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

  if (isLoading) {
    return <FeatureLoadingScreen />;
  }

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  const handleCreate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const presentationTitle = title.trim() || "Untitled Presentation";

      const presentationId = await createPresentation({
        title: presentationTitle,
        slideStyle,
        templateId: selectedTemplateId ?? undefined,
      });

      let systemPrompt: string;
      let userMessage: string;
      const styleLabel =
        slideStyle === "illustrative"
          ? "illustrative (Speaker Assist)"
          : "wordy (Self-Contained)";

      if (inputMode === "prompt") {
        systemPrompt = SLIDES_OUTLINE_SYSTEM_PROMPT;
        userMessage = `Slide Style: ${styleLabel}\n\nCreate a presentation about:\n${input.trim()}`;
      } else if (enhanceOutline) {
        systemPrompt = SLIDES_OUTLINE_ENHANCE_SYSTEM_PROMPT;
        userMessage = `Slide Style: ${styleLabel}\n\n${buildEnhanceOutlinePrompt(input.trim())}`;
      } else {
        systemPrompt = SLIDES_OUTLINE_PARSE_SYSTEM_PROMPT;
        userMessage = `Slide Style: ${styleLabel}\n\n${buildParseOutlinePrompt(input.trim())}`;
      }

      const conversationId = await createConversation({
        model: "google:gemini-3-flash",
        title: `Slides: ${presentationTitle}`,
        systemPrompt,
      });

      await linkConversation({
        presentationId,
        conversationId,
      });

      await updateStatus({
        presentationId,
        status: "outline_generating",
      });

      await sendMessage({
        conversationId,
        content: userMessage,
        modelId: "google:gemini-3-flash",
      });

      router.push(`/slides/${presentationId}/outline`);
    } catch (error) {
      console.error("Error creating presentation:", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Daily presentation limit")) {
        toast.error(message);
      } else {
        toast.error("Failed to create presentation. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="bg-background text-foreground animate-in fade-in duration-500 pb-32">
        <div className="container max-w-3xl mx-auto py-12 px-4 sm:px-6">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Create Presentation
            </h1>
            <p className="text-muted-foreground">
              Turn your ideas into professional slides in seconds with AI.
            </p>
          </div>

          <div className="space-y-8">
            {/* Main Input Card */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
              {/* Input Mode Radio */}
              <div className="flex justify-center">
                <RadioGroup
                  value={inputMode}
                  onValueChange={(v) => setInputMode(v as "prompt" | "outline")}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prompt" id="mode-prompt" />
                    <Label
                      htmlFor="mode-prompt"
                      className="cursor-pointer font-medium"
                    >
                      Generate from Idea
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outline" id="mode-outline" />
                    <Label
                      htmlFor="mode-outline"
                      className="cursor-pointer font-medium"
                    >
                      I Have an Outline
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Text Input Area */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="input" className="text-base font-semibold">
                    {inputMode === "prompt"
                      ? "Describe your presentation"
                      : "Paste your outline"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadedFileName || "Upload File"}
                    </Button>
                  </div>
                </div>

                <div className="relative group">
                  <Textarea
                    id="input"
                    placeholder={
                      inputMode === "prompt"
                        ? `e.g. "Quarterly business review for Q4 2024 focusing on growth metrics and key achievements..."`
                        : `1. Introduction\n   - Context\n   - Goals\n\n2. Metric Analysis...`
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    className={cn(
                      "min-h-[200px] max-h-[500px] resize-none overflow-y-auto text-base leading-relaxed p-4 border-muted-foreground/20 focus-visible:border-primary/50 transition-all font-normal",
                      "bg-muted/10 group-hover:bg-muted/20 focus:bg-background",
                    )}
                    style={{ fieldSizing: "fixed" } as any}
                  />
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm transition-opacity duration-200",
                        input.length > 0 ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {input.length} chars
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {inputMode === "prompt"
                    ? "AI will research the topic and structure a complete deck."
                    : "AI will format your outline into professional slides."}
                </p>
              </div>

              {/* Outline Enhancer Toggle */}
              <AnimatePresence>
                {inputMode === "outline" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="enhance"
                          className="text-sm font-medium flex items-center gap-2"
                        >
                          Smart Enhance
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Allow AI to research and expand your bullet points
                        </p>
                      </div>
                      <Switch
                        id="enhance"
                        checked={enhanceOutline}
                        onCheckedChange={setEnhanceOutline}
                        disabled={loading}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Configuration Section */}
            <div className="grid gap-8 md:grid-cols-2">
              {/* Title Input */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-medium">
                  Presentation Title{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="title"
                    placeholder="Auto-generated if empty"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                    className="pl-2"
                  />
                  <PenTool className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/30 pointer-events-none" />
                </div>
              </div>

              {/* Slide Style */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Presentation Style
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSlideStyle("illustrative")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                      slideStyle === "illustrative"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-1.5 rounded-md",
                          slideStyle === "illustrative"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium block">
                          Speaker Assist
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Visual slides, detailed notes
                        </span>
                      </div>
                    </div>
                    {slideStyle === "illustrative" && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </button>

                  <button
                    onClick={() => setSlideStyle("wordy")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                      slideStyle === "wordy"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-1.5 rounded-md",
                          slideStyle === "wordy"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium block">
                          Self-Contained
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Detailed slides, standalone
                        </span>
                      </div>
                    </div>
                    {slideStyle === "wordy" && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Brand Template Section */}
            <Collapsible
              open={templateSectionOpen}
              onOpenChange={setTemplateSectionOpen}
              className="border rounded-xl overflow-hidden"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-between w-full p-4 text-left transition-colors",
                    templateSectionOpen ? "bg-muted/30" : "hover:bg-muted/20",
                    selectedTemplateId && "border-l-2 border-l-primary",
                  )}
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        selectedTemplateId
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium block">
                        Brand Template
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplateId
                          ? "Template selected"
                          : "Match your organization's branding"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      templateSectionOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t">
                  <TemplateUpload
                    onTemplateSelect={setSelectedTemplateId}
                    selectedTemplateId={selectedTemplateId}
                    disabled={loading}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="pt-4">
              <Button
                onClick={handleCreate}
                disabled={loading || !input.trim()}
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Orchestrating Presentation...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Presentation
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Estimated generation time: ~30 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
