"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarIcon,
  CheckSquare,
  FileAudio,
  FileText,
  Loader2,
  Upload,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type ExtractedNote,
  type ExtractedTask,
  MeetingReviewPanel,
} from "@/components/assistant/MeetingReviewPanel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { FeatureDisabled } from "@/components/ui/feature-disabled";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUserPreference } from "@/hooks/useUserPreference";
import { cn } from "@/lib/utils";

type ProcessingState =
  | "idle"
  | "transcribing"
  | "extracting"
  | "reviewing"
  | "saving"
  | "confirmed"
  | "error";

export default function SmartAssistantPage() {
  const showSmartAssistant = useUserPreference("showSmartAssistant");
  const [state, setState] = useState<ProcessingState>("idle");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [extractedNotes, setExtractedNotes] = useState<ExtractedNote[]>([]);
  const [error, setError] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());

  // Actions
  // @ts-ignore - Type depth exceeded
  const transcribeAudio = useAction(api.transcription.transcribeAudio);
  // @ts-ignore - Type depth exceeded
  const extractFromMeeting = useAction(
    api.ai.meetingExtraction.extractFromMeeting,
  );
  // @ts-ignore - Type depth exceeded
  const createTask = useMutation(api.tasks.create);
  // @ts-ignore - Type depth exceeded
  const createNote = useMutation(api.notes.createNote);
  // @ts-ignore - Type depth exceeded
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleAudioUpload = async () => {
    if (!audioFile) return;

    const fileSizeMB = audioFile.size / (1024 * 1024);
    const MAX_SIZE_MB = 24;

    if (fileSizeMB > MAX_SIZE_MB) {
      toast.error(
        `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum is ${MAX_SIZE_MB}MB.`,
      );
      return;
    }

    if (fileSizeMB > 15) {
      toast.info(
        `Large file (${fileSizeMB.toFixed(1)}MB) - may take up to 90 seconds`,
      );
    }

    setState("transcribing");
    setError("");

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioFile.type },
        body: audioFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio file");
      }

      const { storageId } = await uploadResponse.json();

      // Transcribe with timeout
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("TIMEOUT")), 95_000);
      });

      const transcriptionPromise = transcribeAudio({
        storageId,
        mimeType: audioFile.type,
      }).then((result) => {
        clearTimeout(timeoutId);
        return result;
      });

      const transcriptResult = await Promise.race([
        transcriptionPromise,
        timeoutPromise,
      ]);
      setTranscript(transcriptResult);

      // Extract tasks AND notes
      setState("extracting");
      const extraction = await extractFromMeeting({
        transcript: transcriptResult,
        meetingDate: meetingDate.toISOString(),
      });

      setExtractedTasks(extraction.tasks || []);
      setExtractedNotes(extraction.notes || []);
      setState("reviewing");
    } catch (err: any) {
      const message = err?.message || String(err);
      if (message === "TIMEOUT") {
        setError("Transcription timed out. Try a shorter clip.");
        toast.error("Timeout. Try a shorter clip or compress the file.");
      } else {
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
      const extraction = await extractFromMeeting({
        transcript: transcript.trim(),
        meetingDate: meetingDate.toISOString(),
      });

      setExtractedTasks(extraction.tasks || []);
      setExtractedNotes(extraction.notes || []);
      setState("reviewing");
    } catch (err: any) {
      setError(err.message || "Extraction failed");
      setState("error");
      toast.error(err.message || "Extraction failed");
    }
  };

  const handleConfirm = async (data: {
    tasks: ExtractedTask[];
    notes: ExtractedNote[];
  }) => {
    setState("saving");
    try {
      // Create tasks
      const taskPromises = data.tasks.map((task) =>
        createTask({
          title: task.title,
          description: task.description,
          deadline: task.deadline ?? undefined,
          urgency: task.urgency ?? undefined,
          projectId: task.projectId,
          sourceType: "smart_assistant",
        }),
      );

      // Create notes
      const notePromises = data.notes.map((note) =>
        createNote({
          title: note.title,
          content: note.content,
          projectId: note.projectId,
        }),
      );

      await Promise.all([...taskPromises, ...notePromises]);

      setState("confirmed");
      const taskCount = data.tasks.length;
      const noteCount = data.notes.length;
      const parts = [];
      if (taskCount > 0)
        parts.push(`${taskCount} task${taskCount > 1 ? "s" : ""}`);
      if (noteCount > 0)
        parts.push(`${noteCount} note${noteCount > 1 ? "s" : ""}`);
      toast.success(`Created ${parts.join(" and ")}`);

      // Reset after delay
      setTimeout(() => {
        setState("idle");
        setAudioFile(null);
        setTranscript("");
        setExtractedTasks([]);
        setExtractedNotes([]);
        setMeetingDate(new Date());
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setState("error");
      toast.error("Failed to save");
    }
  };

  if (!showSmartAssistant) {
    return (
      <FeatureDisabled
        feature="Smart Assistant"
        settingKey="showSmartAssistant"
      />
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-none z-50 border-b">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <Wand2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Smart Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Extract tasks and notes from meetings
              </p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {state === "idle" && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Meeting Date Selector */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Meeting Date</p>
                  <p className="text-xs text-muted-foreground">
                    Used to calculate actual dates from relative references
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !meetingDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {meetingDate ? (
                        format(meetingDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={meetingDate}
                      onSelect={(date) => date && setMeetingDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Tabs defaultValue="audio" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="audio" className="gap-2">
                    <FileAudio className="h-4 w-4" />
                    Audio
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="audio" className="mt-0">
                  <Card className="border-2 border-dashed">
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="p-4 rounded-full bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          Upload Meeting Recording
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          Drop an audio file to extract tasks and notes
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

                      <Button
                        variant="outline"
                        asChild
                        className="w-full max-w-xs"
                      >
                        <label
                          htmlFor="audio-upload"
                          className="cursor-pointer"
                        >
                          Choose File
                        </label>
                      </Button>

                      {audioFile && (
                        <div className="mt-4 w-full p-3 bg-muted/50 rounded-lg border flex items-center justify-between text-sm">
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
                  <Card>
                    <div className="p-4 space-y-4">
                      <Textarea
                        placeholder="Paste your meeting transcript or notes here..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={12}
                        className="resize-none text-base leading-relaxed"
                      />
                      <Button
                        onClick={handleTranscriptSubmit}
                        disabled={!transcript.trim()}
                        className="w-full"
                        size="lg"
                      >
                        Extract Tasks & Notes
                        <Wand2 className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                  <CheckSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Task Extraction</p>
                    <p className="text-xs text-muted-foreground">
                      Action items with deadlines and priorities
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Meeting Notes</p>
                    <p className="text-xs text-muted-foreground">
                      Decisions, insights, and follow-ups
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(state === "transcribing" ||
            state === "extracting" ||
            state === "saving") && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="p-6 rounded-full bg-muted">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">
                  {state === "transcribing" && "Transcribing audio..."}
                  {state === "extracting" && "Extracting tasks & notes..."}
                  {state === "saving" && "Saving items..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {state === "transcribing" &&
                    "This may take a minute depending on file size"}
                  {state === "extracting" &&
                    "AI is analyzing the content for action items and insights"}
                  {state === "saving" && "Creating your tasks and notes"}
                </p>
              </div>
            </div>
          )}

          {state === "reviewing" && (
            <div className="h-[calc(100vh-16rem)]">
              <MeetingReviewPanel
                tasks={extractedTasks}
                notes={extractedNotes}
                onConfirm={handleConfirm}
                onCancel={() => {
                  setState("idle");
                  setExtractedTasks([]);
                  setExtractedNotes([]);
                }}
              />
            </div>
          )}

          {state === "confirmed" && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Items Created</h3>
              <p className="text-sm text-muted-foreground">
                Returning to start...
              </p>
            </div>
          )}

          {state === "error" && (
            <Card className="border-destructive/50 bg-destructive/5 p-8 text-center max-w-md mx-auto mt-12">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-destructive">
                  Processing Failed
                </h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => setState("idle")} variant="outline">
                  Try Again
                </Button>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
