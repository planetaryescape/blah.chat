"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileAudio, FileText, Loader2 } from "lucide-react";
import { TaskReviewPanel } from "@/components/assistant/TaskReviewPanel";
import { toast } from "sonner";

type ProcessingState =
  | "idle"
  | "transcribing"
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

  // Mutations
  // @ts-ignore - Type depth exceeded
  const transcribeAudio = useMutation(api.transcription.transcribeAudio);
  // @ts-ignore - Type depth exceeded
  const extractTasks = useMutation(api.ai.taskExtraction.extractTasksFromTranscript);
  // @ts-ignore - Type depth exceeded
  const createTask = useMutation(api.tasks.create);

  const handleAudioUpload = async () => {
    if (!audioFile) return;

    setState("transcribing");
    setError("");

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const audioData = base64.split(",")[1];

        // Transcribe
        const result = await transcribeAudio({
          audio: audioData,
          mimeType: audioFile.type,
        });

        setTranscript(result.text);

        // Extract tasks
        setState("extracting");
        const tasks = await extractTasks({
          transcript: result.text,
          sourceId: result.id,
        });

        setExtractedTasks(tasks);
        setState("reviewing");
      };

      reader.readAsDataURL(audioFile);
    } catch (err: any) {
      setError(err.message || "Processing failed");
      setState("error");
      toast.error(err.message || "Processing failed");
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
          })
        )
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
    <div className="container max-w-4xl py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Smart Assistant</h1>
        <p className="text-muted-foreground">
          Upload meeting recordings or paste transcripts to extract action items
        </p>
      </header>

      {state === "idle" && (
        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audio">
              <FileAudio className="mr-2 h-4 w-4" />
              Audio Recording
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="mr-2 h-4 w-4" />
              Text Transcript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted p-12">
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload">
                    <Button variant="outline" asChild>
                      <span>Choose Audio File</span>
                    </Button>
                  </label>
                  {audioFile && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAudioUpload}
                  disabled={!audioFile}
                  className="w-full"
                >
                  Process Recording
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="text">
            <Card className="p-6">
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste your meeting transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={12}
                  className="resize-none"
                />
                <Button
                  onClick={handleTranscriptSubmit}
                  disabled={!transcript.trim()}
                  className="w-full"
                >
                  Extract Tasks
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {state === "transcribing" && (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-lg font-medium">Transcribing audio...</h3>
            <p className="text-sm text-muted-foreground">This may take a minute</p>
          </div>
        </Card>
      )}

      {state === "extracting" && (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-lg font-medium">Extracting action items...</h3>
            <p className="text-sm text-muted-foreground">Analyzing transcript</p>
          </div>
        </Card>
      )}

      {state === "reviewing" && (
        <TaskReviewPanel
          tasks={extractedTasks}
          onConfirm={handleConfirmTasks}
          onCancel={() => {
            setState("idle");
            setExtractedTasks([]);
          }}
        />
      )}

      {state === "confirmed" && (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white">
              ✓
            </div>
            <h3 className="text-lg font-medium">Tasks created successfully!</h3>
          </div>
        </Card>
      )}

      {state === "error" && (
        <Card className="p-6 border-destructive">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-destructive">Error</h3>
            <p className="text-sm">{error}</p>
            <Button onClick={() => setState("idle")} variant="outline">
              Try Again
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
