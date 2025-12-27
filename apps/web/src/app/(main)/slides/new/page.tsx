"use client";

export const dynamic = "force-dynamic";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  getOutlineParseSystemPrompt,
  getOutlineSystemPrompt,
} from "@blah-chat/backend/convex/lib/prompts/operational/slidesOutline";
import { useAction, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileIcon,
  Grid,
  Loader2,
  Mic,
  Monitor,
  Palette,
  PenTool,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { StyleSelector } from "@/components/slides/StyleSelector";
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
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { cn } from "@/lib/utils";

export default function NewSlidesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewSlidesContent />
    </Suspense>
  );
}

function NewSlidesContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<Id<"designTemplates"> | null>(null);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const [_uploadingDocument, setUploadingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL-persisted wizard state (enables deep linking)
  type Step = "format" | "content" | "style";
  const [currentStep, setCurrentStep] = useQueryState(
    "step",
    parseAsStringLiteral(["format", "content", "style"] as const).withDefault(
      "format",
    ),
  );
  const [aspectRatio, setAspectRatio] = useQueryState(
    "ratio",
    parseAsStringLiteral(["16:9", "1:1", "9:16"] as const).withDefault("16:9"),
  );
  const [slideStyle, setSlideStyle] = useQueryState(
    "style",
    parseAsStringLiteral(["wordy", "illustrative"] as const).withDefault(
      "illustrative",
    ),
  );
  const [inputMode, setInputMode] = useQueryState(
    "mode",
    parseAsStringLiteral(["prompt", "outline"] as const).withDefault("prompt"),
  );
  const [imageStyle, setImageStyle] = useQueryState(
    "imageStyle",
    parseAsString.withDefault("minimalist-line"),
  );
  const [enhanceOutline, setEnhanceOutline] = useQueryState(
    "enhance",
    parseAsBoolean.withDefault(true),
  );
  const [enableGrounding, setEnableGrounding] = useQueryState(
    "grounding",
    parseAsBoolean.withDefault(false),
  );

  const { showSlides, isLoading } = useFeatureToggles();

  // Source content from chat (for "Create Presentation from..." flow)
  const [sourceMessageId] = useQueryState("messageId", parseAsString);
  const [sourceConversationId] = useQueryState("conversationId", parseAsString);

  // Fetch conversation messages if source provided
  // @ts-ignore - Type depth exceeded
  const sourceMessages = useQuery(
    api.messages.list,
    sourceConversationId
      ? { conversationId: sourceConversationId as Id<"conversations"> }
      : "skip",
  );

  // Auto-populate from chat source
  useEffect(() => {
    if (!sourceMessages || input) return;

    // If messageId specified, use just that message
    if (sourceMessageId) {
      const message = sourceMessages.find(
        (m: { _id: string }) => m._id === sourceMessageId,
      );
      if (message?.content) {
        setInput(message.content);
      }
      return;
    }

    // Otherwise format full conversation
    const formatted = sourceMessages
      .filter(
        (m: { status: string; content?: string }) =>
          m.status === "complete" && m.content,
      )
      .map(
        (m: { role: string; content: string }) =>
          `**${m.role === "user" ? "User" : "Assistant"}:**\n${m.content}`,
      )
      .join("\n\n---\n\n");

    if (formatted) {
      setInput(formatted);
    }
  }, [sourceMessages, sourceMessageId, input]);

  // Format-specific content density labels
  const contentDensityLabels = {
    "16:9": {
      illustrative: {
        label: "Speaker Assist",
        desc: "Visual slides, detailed notes",
        Icon: Mic,
      },
      wordy: {
        label: "Self-Contained",
        desc: "Detailed slides, standalone",
        Icon: FileIcon,
      },
    },
    "1:1": {
      illustrative: {
        label: "Visual-First",
        desc: "Bold visuals, minimal text",
        Icon: Sparkles,
      },
      wordy: {
        label: "Text-Rich",
        desc: "Readable cards, more context",
        Icon: FileIcon,
      },
    },
    "9:16": {
      illustrative: {
        label: "Visual-First",
        desc: "Visual storytelling",
        Icon: Sparkles,
      },
      wordy: { label: "Text-Rich", desc: "Caption-forward", Icon: FileIcon },
    },
  } as const;
  const densityConfig = contentDensityLabels[aspectRatio];

  // Convex mutations and actions (must be declared before callbacks that use them)
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
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const extractDocument = useAction(
    api.tools.fileDocument.extractDocumentForSlides,
  );

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

      // TXT/MD: read directly
      if (file.type === "text/plain" || file.type === "text/markdown") {
        const text = await file.text();
        setInput(text);
        setUploadedFileName(file.name);
        toast.success(`Loaded ${file.name}`);
        return;
      }

      // PDF/DOCX: upload to storage, extract via backend
      setUploadingDocument(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();

        const result = await extractDocument({
          storageId,
          fileName: file.name,
          mimeType: file.type,
        });

        if (result.success && result.text) {
          setInput(result.text);
          setUploadedFileName(file.name);
          toast.success(`Extracted content from ${file.name}`);
        } else {
          toast.error(result.error || "Failed to process document");
        }
      } catch (error) {
        toast.error("Failed to process document");
        console.error(error);
      } finally {
        setUploadingDocument(false);
      }
    },
    [generateUploadUrl, extractDocument],
  );

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
        aspectRatio,
        imageStyle,
      });

      let systemPrompt: string;
      let userMessage: string;

      // Use component-level densityConfig for styleLabel
      const styleLabel =
        slideStyle === "illustrative"
          ? `illustrative (${densityConfig.illustrative.label})`
          : `wordy (${densityConfig.wordy.label})`;

      const formatLabel =
        aspectRatio === "16:9"
          ? "Presentation (16:9)"
          : aspectRatio === "1:1"
            ? "Social (Square)"
            : "Social (Vertical)";

      // Get format-specific content type label
      const contentTypeLabel =
        aspectRatio === "16:9"
          ? "presentation"
          : aspectRatio === "1:1"
            ? "carousel"
            : "story";

      // Include title in prompt if user provided one
      const titleInstruction = title.trim()
        ? `\nPresentation Title: "${title.trim()}" (use this exact title)\n`
        : "";

      if (inputMode === "prompt") {
        // Creative freedom - generate from scratch
        systemPrompt = getOutlineSystemPrompt(aspectRatio);
        userMessage = `Slide Style: ${styleLabel}\nFormat: ${formatLabel}${titleInstruction}\nCreate a ${contentTypeLabel} about:\n${input.trim()}`;
      } else if (enhanceOutline) {
        // Enhance but respect user's structure
        systemPrompt = getOutlineParseSystemPrompt(aspectRatio);
        userMessage = `Slide Style: ${styleLabel}\nFormat: ${formatLabel}${titleInstruction}\nEnhance this ${contentTypeLabel} outline. Improve the content but keep the user's structure:\n${input.trim()}`;
      } else {
        // Strict parse - preserve user's structure exactly
        systemPrompt = getOutlineParseSystemPrompt(aspectRatio);
        userMessage = `Slide Style: ${styleLabel}\nFormat: ${formatLabel}${titleInstruction}\nFormat this outline into structured slides. Preserve the user's structure EXACTLY:\n${input.trim()}`;
      }

      const conversationId = await createConversation({
        model: "google:gemini-3-flash",
        title: "New Chat", // Triggers auto-title after first AI response
        systemPrompt,
        isPresentation: true,
        enableGrounding,
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

  const stepOrder: Step[] = ["format", "content", "style"];
  const currentStepIndex = stepOrder.indexOf(currentStep);

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

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { id: "format" as Step, label: "Format" },
              { id: "content" as Step, label: "Content" },
              { id: "style" as Step, label: "Style" },
            ].map((step, idx) => {
              const stepIdx = stepOrder.indexOf(step.id);
              const isComplete = stepIdx < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "w-8 h-0.5",
                        isComplete ? "bg-primary" : "bg-muted",
                      )}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      stepIdx <= currentStepIndex && setCurrentStep(step.id)
                    }
                    disabled={stepIdx > currentStepIndex}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                      isCurrent && "bg-primary text-primary-foreground",
                      isComplete &&
                        "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",
                      !isCurrent &&
                        !isComplete &&
                        "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            {/* Step 1: Format */}
            {currentStep === "format" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-card border rounded-xl shadow-sm p-6 sm:p-8">
                  <Label className="text-base font-semibold mb-4 block">
                    What format do you need?
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      {
                        id: "16:9",
                        label: "Presentation",
                        icon: Monitor,
                        desc: "Standard 16:9",
                      },
                      {
                        id: "1:1",
                        label: "Social Post",
                        icon: Grid,
                        desc: "Square 1:1",
                      },
                      {
                        id: "9:16",
                        label: "Story",
                        icon: Smartphone,
                        desc: "Vertical 9:16",
                      },
                    ].map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setAspectRatio(format.id as any)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl border-2 transition-all outline-none",
                          aspectRatio === format.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted hover:border-primary/20 hover:bg-muted/30 text-muted-foreground",
                        )}
                      >
                        <format.icon className="h-8 w-8 mb-3" />
                        <span className="text-sm font-semibold">
                          {format.label}
                        </span>
                        <span className="text-xs opacity-70 mt-1">
                          {format.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep("content")}>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Content */}
            {currentStep === "content" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-card border rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
                  {/* Input Mode Radio */}
                  <div className="flex justify-center">
                    <RadioGroup
                      value={inputMode}
                      onValueChange={(v) =>
                        setInputMode(v as "prompt" | "outline")
                      }
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
                      <Label
                        htmlFor="input"
                        className="text-base font-semibold"
                      >
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

                  {/* Web Research Toggle */}
                  <div className="flex items-center justify-between py-3 border-t">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="grounding"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        Web Research
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Search the web for facts, statistics, and citations
                      </p>
                    </div>
                    <Switch
                      id="grounding"
                      checked={enableGrounding}
                      onCheckedChange={setEnableGrounding}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Title Input */}
                <div className="bg-card border rounded-xl shadow-sm p-6 sm:p-8">
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
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep("format")}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep("style")}
                    disabled={!input.trim()}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Style */}
            {currentStep === "style" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Content Density */}
                <div className="bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4">
                  <Label className="text-base font-semibold">
                    Content Density
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSlideStyle("illustrative")}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                        slideStyle === "illustrative"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-md",
                            slideStyle === "illustrative"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <densityConfig.illustrative.Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-sm font-medium block">
                            {densityConfig.illustrative.label}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {densityConfig.illustrative.desc}
                          </span>
                        </div>
                      </div>
                      {slideStyle === "illustrative" && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlideStyle("wordy")}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                        slideStyle === "wordy"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-border hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-md",
                            slideStyle === "wordy"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <densityConfig.wordy.Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-sm font-medium block">
                            {densityConfig.wordy.label}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {densityConfig.wordy.desc}
                          </span>
                        </div>
                      </div>
                      {slideStyle === "wordy" && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Visual Style Selector */}
                <div className="bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4">
                  <Label className="text-base font-semibold">
                    Visual Style
                  </Label>
                  <StyleSelector
                    selectedStyleId={imageStyle}
                    onSelect={setImageStyle}
                  />
                </div>

                {/* Brand Template Section */}
                <Collapsible
                  open={templateSectionOpen}
                  onOpenChange={setTemplateSectionOpen}
                  className="border rounded-xl overflow-hidden bg-card"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between w-full p-4 text-left transition-colors",
                        templateSectionOpen
                          ? "bg-muted/30"
                          : "hover:bg-muted/20",
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

                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep("content")}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={loading || !input.trim()}
                    className="h-12 px-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Orchestrating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Presentation
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Estimated generation time: ~30 seconds
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
