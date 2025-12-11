# Phases 5-8: UI & Integration - Complete Implementation Guide

This document consolidates the remaining implementation phases for Smart Manager. Each section is self-contained with full context.

---

# Phase 5: Smart Assistant UI

## Overview

Build the user interface for Smart Assistant: audio/transcript upload, processing states, and task review panel.

**Duration**: 2 days
**Dependencies**: Phase 2 (Tasks backend)
**Output**: `/assistant` route with full upload → review → confirm workflow

## Context

Smart Assistant lets users upload meeting recordings or paste transcripts. The UI guides them through:
1. **Upload**: Audio file or text input
2. **Transcribe**: Show progress (if audio)
3. **Extract**: AI extracts tasks with confidence scores
4. **Review**: User edits/approves tasks before saving
5. **Confirm**: Bulk save to tasks table

## State Machine

```
idle → transcribing → extracting → reviewing → confirmed
  ↓                                      ↓
error ←──────────────────────────────── cancelled
```

## Implementation

### File: `src/app/(main)/assistant/page.tsx` (NEW)

```typescript
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
import { useToast } from "@/hooks/use-toast";

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

  const { toast } = useToast();

  // Mutations
  // @ts-ignore - Type depth exceeded
  const transcribeAudio = useMutation(api.transcription.transcribeAudio);
  // @ts-ignore
  const extractTasks = useMutation(api.ai.taskExtraction.extractTasksFromTranscript);
  // @ts-ignore
  const createTask = useMutation(api.tasks.createTask);

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
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: `${confirmedTasks.length} tasks created`,
      });

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
      toast({
        title: "Error",
        description: "Failed to save tasks",
        variant: "destructive",
      });
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
```

### File: `src/components/assistant/TaskReviewPanel.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExtractedTask {
  title: string;
  description?: string;
  deadline?: number;
  deadlineSource?: string;
  urgency?: "low" | "medium" | "high" | "urgent";
  sourceType?: string;
  sourceId?: string;
  sourceContext: {
    snippet: string;
    timestamp?: number;
    confidence: number;
  };
}

export function TaskReviewPanel({
  tasks,
  onConfirm,
  onCancel,
}: {
  tasks: ExtractedTask[];
  onConfirm: (tasks: ExtractedTask[]) => void;
  onCancel: () => void;
}) {
  const [editedTasks, setEditedTasks] = useState(tasks);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(
    new Set(tasks.map((_, i) => i))
  );

  const toggleTask = (index: number) => {
    const next = new Set(selectedTasks);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedTasks(next);
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    const next = [...editedTasks];
    next[index] = { ...next[index], ...updates };
    setEditedTasks(next);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Extracted Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks found · {selectedTasks.size} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const confirmed = editedTasks.filter((_, i) => selectedTasks.has(i));
              onConfirm(confirmed);
            }}
            disabled={selectedTasks.size === 0}
          >
            Confirm {selectedTasks.size} Tasks
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {editedTasks.map((task, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selectedTasks.has(i)}
                onCheckedChange={() => toggleTask(i)}
                className="mt-1"
              />

              <div className="flex-1 space-y-3">
                {/* Title */}
                <Input
                  value={task.title}
                  onChange={(e) => updateTask(i, { title: e.target.value })}
                  className="font-medium"
                  placeholder="Task title"
                />

                {/* Description */}
                {task.description && (
                  <Textarea
                    value={task.description}
                    onChange={(e) => updateTask(i, { description: e.target.value })}
                    rows={2}
                    placeholder="Description"
                  />
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Confidence */}
                  <Badge variant="outline" className="gap-1">
                    <div
                      className={`h-2 w-2 rounded-full ${getConfidenceColor(
                        task.sourceContext.confidence
                      )}`}
                    />
                    {Math.round(task.sourceContext.confidence * 100)}% confident
                  </Badge>

                  {/* Urgency */}
                  {task.urgency && (
                    <Select
                      value={task.urgency}
                      onValueChange={(value: any) => updateTask(i, { urgency: value })}
                    >
                      <SelectTrigger className="h-6 w-auto border-0 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low priority</SelectItem>
                        <SelectItem value="medium">Medium priority</SelectItem>
                        <SelectItem value="high">High priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Deadline */}
                  {task.deadlineSource && (
                    <Badge variant="outline">
                      📅 {task.deadlineSource}
                      {task.deadline && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({new Date(task.deadline).toLocaleDateString()})
                        </span>
                      )}
                    </Badge>
                  )}
                </div>

                {/* Context snippet */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show context
                  </summary>
                  <p className="mt-2 rounded bg-muted p-2 italic">
                    "{task.sourceContext.snippet}"
                  </p>
                </details>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## Success Criteria

- [ ] Can upload audio file → transcribes successfully
- [ ] Can paste transcript → extracts tasks
- [ ] Task review panel shows all extracted tasks
- [ ] Can edit task title/description inline
- [ ] Can change urgency via dropdown
- [ ] Confidence scores displayed with color coding
- [ ] Can select/deselect tasks
- [ ] Bulk confirm creates all selected tasks
- [ ] Processing states show correctly (loading spinners)
- [ ] Error states handled gracefully

---

# Phase 6: Project Detail View

## Overview

Create dedicated project detail page with tabbed interface for viewing and managing all project resources.

**Duration**: 3 days
**Dependencies**: Phase 3 (Projects backend), Phase 4 (File RAG)
**Output**: `/projects/[id]` route with full resource management

## Implementation

### File: `src/app/(main)/projects/[id]/page.tsx` (NEW)

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ProjectConversations } from "@/components/projects/ProjectConversations";
import { ProjectFiles } from "@/components/projects/ProjectFiles";
import { ProjectNotes } from "@/components/projects/ProjectNotes";
import { ProjectTasks } from "@/components/projects/ProjectTasks";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id as Id<"projects">;

  // @ts-ignore
  const project = useQuery(api.projects.get, { id: projectId });
  // @ts-ignore
  const resources = useQuery(api.projects.getProjectResources, { projectId });
  // @ts-ignore
  const stats = useQuery(api.projects.getProjectStats, { projectId });

  if (!project) {
    return (
      <div className="container max-w-6xl py-8">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations
            {stats && <span className="ml-1.5">({stats.conversationCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="files">
            Files
            {stats && <span className="ml-1.5">({stats.fileCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes
            {stats && <span className="ml-1.5">({stats.noteCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {stats && <span className="ml-1.5">({stats.activeTaskCount})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview projectId={projectId} resources={resources} stats={stats} />
        </TabsContent>

        <TabsContent value="conversations">
          <ProjectConversations
            projectId={projectId}
            conversations={resources?.conversations || []}
          />
        </TabsContent>

        <TabsContent value="files">
          <ProjectFiles projectId={projectId} files={resources?.files || []} />
        </TabsContent>

        <TabsContent value="notes">
          <ProjectNotes projectId={projectId} notes={resources?.notes || []} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasks projectId={projectId} tasks={resources?.tasks || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### File: `src/components/projects/ProjectFiles.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ProjectFiles({
  projectId,
  files,
}: {
  projectId: Id<"projects">;
  files: any[];
}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // @ts-ignore
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore
  const saveFile = useMutation(api.files.saveFile);
  // @ts-ignore
  const addFileToProject = useMutation(api.projects.addFileToProject);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    if (file.size > WARN_FILE_SIZE) {
      const confirmed = confirm(
        `This file is ${Math.round(file.size / 1024 / 1024)}MB. Large files may take time to process. Continue?`
      );
      if (!confirmed) return;
    }

    setUploading(true);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save file metadata
      const fileId = await saveFile({
        storageId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Link to project
      await addFileToProject({ projectId, fileId });

      toast({
        title: "File uploaded",
        description: "Processing for semantic search...",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Project Files</h3>
        <div>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            onChange={handleUpload}
            accept=".pdf,.docx,.txt,.md"
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-medium">No files yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents to enable semantic search in project chats
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file._id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{file.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(file.embeddingStatus)}
                  {file.embeddingStatus === "completed" && file.chunkCount && (
                    <Badge variant="outline">{file.chunkCount} chunks</Badge>
                  )}
                  {file.embeddingStatus === "failed" && (
                    <Badge variant="destructive">Failed to index</Badge>
                  )}
                  {file.embeddingStatus === "processing" && (
                    <Badge>Processing...</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Success Criteria

- [ ] Project detail page loads with correct data
- [ ] Tabs show resource counts
- [ ] File upload works with progress indication
- [ ] Embedding status indicators update in real-time
- [ ] Can link existing notes/conversations
- [ ] Activity feed shows recent events
- [ ] Stats card shows correct counts
- [ ] Settings dialog allows editing project

---

# Phase 7: Tasks Dashboard

## Overview

Build global tasks dashboard with views, filters, and quick actions.

**Duration**: 2 days
**Dependencies**: Phase 2 (Tasks backend)
**Output**: `/tasks` route with full task management

## Implementation

### File: `src/app/(main)/tasks/page.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

export default function TasksPage() {
  const [view, setView] = useState<"all" | "today" | "upcoming" | "completed">("all");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // @ts-ignore
  const allTasks = useQuery(api.tasks.listTasks, {});
  // @ts-ignore
  const todayTasks = useQuery(api.tasks.getTodaysTasks);
  // @ts-ignore
  const upcomingTasks = useQuery(api.tasks.getUpcomingTasks);

  const getDisplayTasks = () => {
    let tasks =
      view === "today"
        ? todayTasks
        : view === "upcoming"
          ? upcomingTasks
          : allTasks;

    if (!tasks) return [];

    // Apply view filter
    if (view === "completed") {
      tasks = tasks.filter((t: any) => t.status === "completed");
    } else if (view === "all") {
      tasks = tasks.filter((t: any) => t.status !== "completed");
    }

    // Apply project filter
    if (projectFilter) {
      tasks = tasks.filter((t: any) => t.projectId === projectFilter);
    }

    return tasks;
  };

  const displayTasks = getDisplayTasks();

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </header>

      <Tabs value={view} onValueChange={(v: any) => setView(v)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">
            Today
            {todayTasks && <span className="ml-1.5">({todayTasks.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingTasks && <span className="ml-1.5">({upcomingTasks.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TaskFilters onProjectChange={setProjectFilter} />

        <TabsContent value={view} className="space-y-4">
          <TaskList tasks={displayTasks} />
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
```

### File: `src/components/tasks/TaskList.tsx` (NEW)

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle } from "lucide-react";

export function TaskList({ tasks }: { tasks: any[] }) {
  // @ts-ignore
  const completeTask = useMutation(api.tasks.completeTask);
  // @ts-ignore
  const updateTask = useMutation(api.tasks.updateTask);

  const handleToggle = async (task: any) => {
    if (task.status === "completed") {
      await updateTask({ taskId: task._id, status: "confirmed" });
    } else {
      await completeTask({ taskId: task._id });
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          <p>No tasks found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task._id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <Checkbox
              checked={task.status === "completed"}
              onCheckedChange={() => handleToggle(task)}
              className="mt-1"
            />

            <div className="flex-1 min-w-0">
              <h4
                className={`font-medium ${
                  task.status === "completed" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h4>

              {task.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {task.urgency && task.status !== "completed" && (
                  <Badge
                    variant={
                      task.urgency === "urgent"
                        ? "destructive"
                        : task.urgency === "high"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {task.urgency}
                  </Badge>
                )}

                {task.deadline && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(task.deadline, { addSuffix: true })}
                  </Badge>
                )}

                {task.sourceContext?.confidence && (
                  <Badge variant="secondary">
                    AI: {Math.round(task.sourceContext.confidence * 100)}%
                  </Badge>
                )}

                {task.deadline && task.deadline < Date.now() && task.status !== "completed" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

## Success Criteria

- [ ] Tasks dashboard shows all views (All, Today, Upcoming, Completed)
- [ ] Can filter by project
- [ ] Checkbox completes/uncompletes tasks
- [ ] Overdue tasks highlighted
- [ ] Urgency badges color-coded
- [ ] Relative time for deadlines
- [ ] Create task dialog works
- [ ] Empty states shown correctly

---

# Phase 8: Integration & Testing

## Overview

Integrate all features, add navigation, inject project context into chat, and run comprehensive tests.

**Duration**: 1-2 days
**Dependencies**: All previous phases
**Output**: Fully integrated Smart Manager with end-to-end workflows

## Integration Points

### 1. Chat Context Injection

**File**: `convex/generation.ts` (EXTEND)

```typescript
// Add projectId to args
export const generateResponse = action({
  args: {
    // ... existing args
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    // ... existing user message handling

    let systemPrompt = baseSystemPrompt;

    // Inject project context if in project chat
    if (args.projectId) {
      const projectContext = ((await (ctx.runAction as any)(
        // @ts-ignore
        internal.projects.getProjectContext,
        {
          projectId: args.projectId,
          query: userMessage,
        }
      )) as string);

      systemPrompt = `${baseSystemPrompt}\n\n${projectContext}`;
    }

    // Use enhanced system prompt in generation
    // ... rest of generation logic
  },
});
```

### 2. Navigation Links

**File**: `src/components/sidebar/Sidebar.tsx` (EXTEND)

```typescript
import { Mic, CheckSquare } from "lucide-react";

// Add to navigation items
const routes = [
  // ... existing routes
  {
    href: "/assistant",
    label: "Smart Assistant",
    icon: Mic,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
  },
];
```

## Critical Test Scenarios

### Test 1: Smart Assistant End-to-End

```typescript
// 1. Upload audio recording
// 2. Verify transcription completes
// 3. Check tasks extracted (5+ tasks)
// 4. Edit task title
// 5. Change urgency
// 6. Deselect low-confidence task
// 7. Confirm remaining tasks
// 8. Verify tasks appear in /tasks dashboard
// 9. Check auto-tags applied
// 10. Verify memories extracted
```

### Test 2: Project Workspace

```typescript
// 1. Create new project
// 2. Link 2 conversations
// 3. Upload PDF (10MB)
// 4. Verify embedding completes
// 5. Create 3 tasks manually
// 6. Link to project
// 7. Start chat in project
// 8. Ask question about PDF content
// 9. Verify AI uses file context in response
// 10. Check activity feed shows all actions
```

### Test 3: Tasks Dashboard

```typescript
// 1. Create task with deadline "tomorrow"
// 2. Check appears in Today view
// 3. Filter by project
// 4. Complete task via checkbox
// 5. Verify moves to Completed view
// 6. Create urgent task
// 7. Check urgency badge color
// 8. Verify overdue tasks highlighted
```

### Test 4: File RAG

```typescript
// 1. Upload technical PDF to project
// 2. Wait for "Indexed" status
// 3. Check chunk count displayed
// 4. Search "authentication"
// 5. Verify relevant chunks returned
// 6. Start chat: "How does auth work?"
// 7. Verify response includes file content
// 8. Check citations show page numbers
```

## Success Criteria

- [ ] All navigation links work
- [ ] Project chat uses file RAG context
- [ ] Smart Assistant → Tasks → Dashboard workflow complete
- [ ] Activity feed updates in real-time
- [ ] No console errors in production build
- [ ] All TypeScript errors resolved
- [ ] Mobile responsive
- [ ] Loading states smooth
- [ ] Error handling comprehensive

## Final Checklist

**Backend**:
- [ ] All schema tables created and indexed
- [ ] Vector index on fileChunks working
- [ ] Task CRUD operations functional
- [ ] Project junctions working
- [ ] File embedding pipeline functional
- [ ] Semantic search returning results
- [ ] Activity events tracking all actions
- [ ] Memory extraction integrated

**Frontend**:
- [ ] `/assistant` route functional
- [ ] `/projects/[id]` route with tabs
- [ ] `/tasks` dashboard with views
- [ ] File upload with progress
- [ ] Task review panel working
- [ ] Embedding status indicators
- [ ] Activity feed displaying
- [ ] Navigation sidebar updated

**Integration**:
- [ ] Project context in chat working
- [ ] Auto-tagging tasks functional
- [ ] Memory extraction from transcripts
- [ ] File RAG in project chats
- [ ] Cross-linking between features

**Quality**:
- [ ] No type errors (with @ts-ignore where needed)
- [ ] All success criteria met
- [ ] Tests pass
- [ ] Documentation complete
- [ ] Ready for production use

---

## Deployment

1. **Schema**: Deploy Phase 1 schema to production
2. **Backend**: Deploy all backend code (phases 2-4)
3. **Frontend**: Build and deploy UI (phases 5-7)
4. **Test**: Run all critical scenarios
5. **Monitor**: Watch for errors, check embedding queue
6. **Iterate**: Fix issues, optimize performance

**Congratulations!** Smart Manager is complete. 🎉
