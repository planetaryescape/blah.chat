"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import {
  ArrowRight,
  FileAudio,
  FileText,
  Loader2,
  Upload,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskReviewPanel } from "@/components/assistant/TaskReviewPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ProcessingState =
  | "idle"
  | "transcribing"
  | "analyzing"
  | "extracting"
  | "reviewing"
  | "confirmed"
  | "error";

export default function SmartAssistantPage() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Actions
  // @ts-ignore - Type depth exceeded
  const transcribeAudio = useAction(api.transcription.transcribeAudio);
  // @ts-ignore - Type depth exceeded
  const extractTasks = useAction(
    api.ai.taskExtraction.extractTasksFromTranscript,
  );
  // @ts-ignore - Type depth exceeded
  const createTask = useMutation(api.tasks.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleAudioUpload = async () => {
    if (!audioFile) return;

    // Validate file size before upload
    const fileSizeMB = audioFile.size / (1024 * 1024);
    const MAX_SIZE_MB = 24;

    if (fileSizeMB > MAX_SIZE_MB) {
      toast.error(
        `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum is ${MAX_SIZE_MB}MB. Try compressing the file.`,
      );
      return;
    }

    // Warn for large files
    if (fileSizeMB > 15) {
      toast.info(
        `Large file (${fileSizeMB.toFixed(1)}MB) - may take up to 90 seconds`,
      );
    }

    console.log(
      "[Audio Upload] Starting upload, file:",
      audioFile.name,
      audioFile.size,
      "bytes",
    );
    setState("transcribing");
    setError("");

    try {
      // Upload to Convex storage first (avoids 16MB argument size limit)
      console.log("[Audio Upload] Getting upload URL...");
      const uploadUrl = await generateUploadUrl();

      console.log("[Audio Upload] Uploading to storage...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioFile.type },
        body: audioFile,
      });

      if (!uploadResponse.ok) {
        console.error(
          "[Audio Upload] Storage upload failed:",
          uploadResponse.status,
          uploadResponse.statusText,
        );
        throw new Error("Failed to upload audio file to storage");
      }

      const { storageId } = await uploadResponse.json();
      console.log("[Audio Upload] Uploaded to storage:", storageId);

      // Client-side timeout (95s) - ensure it definitely rejects
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error("[Audio Upload] Client timeout reached (95s)");
          reject(new Error("TIMEOUT"));
        }, 95_000);
        console.log("[Audio Upload] Timeout timer started, ID:", timeoutId);
      });

      console.log("[Audio Upload] Starting transcription with 95s timeout...");
      const transcriptionPromise = transcribeAudio({
        storageId,
        mimeType: audioFile.type,
      })
        .then((result) => {
          console.log("[Audio Upload] Transcription promise resolved:", result);
          clearTimeout(timeoutId);
          return result;
        })
        .catch((error) => {
          console.error(
            "[Audio Upload] Transcription promise rejected:",
            error,
          );
          clearTimeout(timeoutId);
          throw error;
        });

      console.log("[Audio Upload] Waiting for transcription...");
      const result = await Promise.race([transcriptionPromise, timeoutPromise]);

      console.log("[Audio Upload] Transcription complete, result:", result);

      // Backend returns string directly, not object
      setTranscript(result);

      // Extract tasks
      setState("extracting");
      console.log("[Audio Upload] Extracting tasks from transcript...");
      const tasks = await extractTasks({
        transcript: result,
        // sourceId omitted - transcription doesn't generate IDs yet
      });

      console.log("[Audio Upload] Extracted tasks:", tasks);

      setExtractedTasks(tasks);
      setState("reviewing");
    } catch (err: any) {
      console.error("[Audio Upload] Error caught:", err);
      console.error("[Audio Upload] Error type:", typeof err);
      console.error("[Audio Upload] Error name:", err?.name);
      console.error("[Audio Upload] Error message:", err?.message);
      console.error("[Audio Upload] Error stack:", err?.stack);

      const message = err?.message || String(err);

      if (message === "TIMEOUT") {
        console.error("[Audio Upload] Handling timeout error");
        setError("Transcription timed out after 90 seconds");
        toast.error("Timeout. Try a shorter clip or compress the file.");
      } else if (message.includes("too large")) {
        console.error("[Audio Upload] Handling file too large error");
        setError(message);
        toast.error(message);
      } else {
        console.error("[Audio Upload] Handling generic error:", message);
        setError(message || "Processing failed");
        toast.error(message || "Processing failed");
      }

      setState("error");
    }
  };

  const handleTranscriptSubmit = async () => {
    if (!transcript.trim()) return;

    setState("extracting");
    setError("");

    try {
      const tasks = await extractTasks({
        transcript: transcript.trim(),
      });

      setExtractedTasks(tasks);
      setState("reviewing");
    } catch (err: any) {
      setError(err.message || "Extraction failed");
      setState("error");
      toast.error(err.message || "Extraction failed");
    }
  };

  const handleConfirmTasks = async (confirmedTasks: any[]) => {
    try {
      // Create tasks in parallel
      await Promise.all(
        confirmedTasks.map((task) =>
          createTask({
            title: task.title,
            description: task.description,
            deadline: task.deadline,
            deadlineSource: task.deadlineSource,
            urgency: task.urgency,
            sourceType: task.sourceType,
            sourceId: task.sourceId,
            sourceContext: task.sourceContext,
          }),
        ),
      );

      setState("confirmed");
      toast.success(`${confirmedTasks.length} tasks created`);

      // Reset after 2 seconds
      setTimeout(() => {
        setState("idle");
        setAudioFile(null);
        setTranscript("");
        setExtractedTasks([]);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setState("error");
      toast.error("Failed to save tasks");
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">
              Smart Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Extract action items from audio, video, or text
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {state === "idle" && (
              <div className="space-y-6">
                <Tabs defaultValue="audio" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/30 border border-border/40 rounded-xl mb-6">
                    <TabsTrigger
                      value="audio"
                      className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <FileAudio className="mr-2 h-4 w-4" />
                      Audio
                    </TabsTrigger>
                    <TabsTrigger
                      value="text"
                      className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="audio" className="mt-0">
                    <Card className="border-2 border-dashed border-border/60 bg-muted/5 hover:bg-muted/10 transition-colors">
                      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="bg-background p-4 rounded-full shadow-sm border border-border/20">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">
                            Upload Audio Recording
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Drag and drop or click to select a meeting recording
                            to extract tasks from
                          </p>
                        </div>

                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) =>
                            setAudioFile(e.target.files?.[0] || null)
                          }
                          className="hidden"
                          id="audio-upload"
                        />

                        <label
                          htmlFor="audio-upload"
                          className="w-full max-w-xs"
                        >
                          <div className="flex items-center justify-center gap-2 cursor-pointer w-full h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                            Choose File
                          </div>
                        </label>

                        {audioFile && (
                          <div className="mt-4 w-full p-3 bg-background rounded-lg border border-border/40 flex items-center justify-between text-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileAudio className="w-4 h-4" />
                              <span className="font-medium text-foreground">
                                {audioFile.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}

                        <Button
                          onClick={handleAudioUpload}
                          disabled={!audioFile}
                          className="w-full max-w-xs mt-4"
                          size="lg"
                        >
                          Process Recording
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="text" className="mt-0">
                    <Card className="border border-border/60 shadow-sm">
                      <div className="p-4 space-y-4">
                        <Textarea
                          placeholder="Paste your meeting transcript here..."
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          rows={12}
                          className="resize-none border-border/40 focus:border-primary/50 text-base leading-relaxed"
                        />
                        <Button
                          onClick={handleTranscriptSubmit}
                          disabled={!transcript.trim()}
                          className="w-full"
                          size="lg"
                        >
                          Extract Tasks
                          <Wand2 className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {(state === "transcribing" ||
              state === "analyzing" ||
              state === "extracting") && (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <div className="relative bg-background p-6 rounded-2xl border border-border/50 shadow-xl">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">
                    {state === "transcribing" && "Transcribing audio..."}
                    {state === "analyzing" && "Analyzing video..."}
                    {state === "extracting" && "Extracting tasks..."}
                  </h3>
                  <p className="text-muted-foreground">
                    {state === "transcribing" &&
                      "This may take a minute depending on file size"}
                    {state === "analyzing" && "Processing video content"}
                    {state === "extracting" &&
                      "Using AI to identify action items"}
                  </p>
                </div>
              </div>
            )}

            {state === "reviewing" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TaskReviewPanel
                  tasks={extractedTasks}
                  onConfirm={handleConfirmTasks}
                  onCancel={() => {
                    setState("idle");
                    setExtractedTasks([]);
                  }}
                />
              </div>
            )}

            {state === "confirmed" && (
              <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 animate-in zoom-in-95 duration-300">
                <div className="h-20 w-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                  <div className="text-4xl">✓</div>
                </div>
                <h3 className="text-2xl font-bold">Tasks Created!</h3>
                <p className="text-muted-foreground">Redirecting back...</p>
              </div>
            )}

            {state === "error" && (
              <Card className="border-destructive/50 bg-destructive/5 p-8 text-center max-w-md mx-auto mt-12">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-destructive">
                    Processing Failed
                  </h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button
                    onClick={() => setState("idle")}
                    variant="outline"
                    className="border-destructive/30 hover:bg-destructive/10"
                  >
                    Try Again
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
