"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon, CheckSquare, FileText, FolderOpen } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_COLORS: Record<string, string> = {
  decision: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  discussion: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  "action-item": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  insight: "bg-green-500/20 text-green-700 dark:text-green-300",
  followup: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  decision: "Decision",
  discussion: "Discussion",
  "action-item": "Action Item",
  insight: "Insight",
  followup: "Follow-up",
};

export interface ExtractedTask {
  title: string;
  description?: string | null;
  deadline?: number | null;
  deadlineText?: string | null;
  urgency?: "low" | "medium" | "high" | "urgent" | null;
  confidence?: number;
  context?: string | null;
  projectId?: Id<"projects">;
}

export interface ExtractedNote {
  title: string;
  content: string;
  category?: string | null;
  confidence?: number;
  context?: string | null;
  projectId?: Id<"projects">;
}

interface MeetingReviewPanelProps {
  tasks: ExtractedTask[];
  notes: ExtractedNote[];
  onConfirm: (data: { tasks: ExtractedTask[]; notes: ExtractedNote[] }) => void;
  onCancel: () => void;
}

export function MeetingReviewPanel({
  tasks,
  notes,
  onConfirm,
  onCancel,
}: MeetingReviewPanelProps) {
  const [editedTasks, setEditedTasks] = useState(tasks);
  const [editedNotes, setEditedNotes] = useState(notes);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(
    new Set(tasks.map((_, i) => i)),
  );
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(
    new Set(notes.map((_, i) => i)),
  );
  const [activeTab, setActiveTab] = useState(
    tasks.length > 0 ? "tasks" : "notes",
  );

  // Fetch projects for assignment
  // @ts-ignore - Type depth exceeded
  const projects = useQuery(api.projects.list) ?? [];

  const toggleTask = (index: number) => {
    const next = new Set(selectedTasks);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedTasks(next);
  };

  const toggleNote = (index: number) => {
    const next = new Set(selectedNotes);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedNotes(next);
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    const next = [...editedTasks];
    next[index] = { ...next[index], ...updates };
    setEditedTasks(next);
  };

  const updateNote = (index: number, updates: Partial<ExtractedNote>) => {
    const next = [...editedNotes];
    next[index] = { ...next[index], ...updates };
    setEditedNotes(next);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const handleConfirm = () => {
    const confirmedTasks = editedTasks.filter((_, i) => selectedTasks.has(i));
    const confirmedNotes = editedNotes.filter((_, i) => selectedNotes.has(i));
    onConfirm({ tasks: confirmedTasks, notes: confirmedNotes });
  };

  const totalSelected = selectedTasks.size + selectedNotes.size;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Extraction</h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-4 w-4" />
              {selectedTasks.size}/{tasks.length} tasks
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {selectedNotes.size}/{notes.length} notes
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={totalSelected === 0}>
            Save {totalSelected} Items
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="shrink-0 grid w-full grid-cols-2 h-11 p-1 bg-muted/30 border border-border/40 rounded-xl">
          <TabsTrigger
            value="tasks"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Tasks
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTasks.size}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
          >
            <FileText className="h-4 w-4" />
            Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedNotes.size}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="flex-1 min-h-0 mt-4">
          <div className="h-full overflow-y-auto space-y-4 pr-2">
            {editedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
                <p>No tasks were extracted</p>
              </div>
            ) : (
              editedTasks.map((task, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedTasks.has(i)}
                      onCheckedChange={() => toggleTask(i)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-3">
                      <Input
                        value={task.title}
                        onChange={(e) =>
                          updateTask(i, { title: e.target.value })
                        }
                        className="font-medium"
                        placeholder="Task title"
                      />

                      {task.description && (
                        <Textarea
                          value={task.description}
                          onChange={(e) =>
                            updateTask(i, { description: e.target.value })
                          }
                          rows={2}
                          placeholder="Description"
                        />
                      )}

                      <div className="flex flex-wrap gap-2">
                        {/* Confidence */}
                        {task.confidence !== undefined && (
                          <Badge variant="outline" className="gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${getConfidenceColor(task.confidence)}`}
                            />
                            {Math.round(task.confidence * 100)}%
                          </Badge>
                        )}

                        {/* Urgency */}
                        <Select
                          value={task.urgency || "medium"}
                          onValueChange={(value: any) =>
                            updateTask(i, { urgency: value })
                          }
                        >
                          <SelectTrigger className="h-7 w-auto border-0 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Project Assignment */}
                        {projects.length > 0 && (
                          <Select
                            value={task.projectId?.toString() || "none"}
                            onValueChange={(value) =>
                              updateTask(i, {
                                projectId:
                                  value === "none"
                                    ? undefined
                                    : (value as Id<"projects">),
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-auto border-0 px-2">
                              <FolderOpen className="h-3.5 w-3.5 mr-1" />
                              <SelectValue placeholder="Project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Project</SelectItem>
                              {projects.map((project: any) => (
                                <SelectItem
                                  key={project._id}
                                  value={project._id}
                                >
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Deadline */}
                        {task.deadline && (
                          <Badge variant="outline" className="gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(task.deadline), "MMM d, yyyy")}
                          </Badge>
                        )}
                        {task.deadlineText && !task.deadline && (
                          <Badge variant="outline" className="gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {task.deadlineText}
                          </Badge>
                        )}
                      </div>

                      {/* Context */}
                      {task.context && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Show context
                          </summary>
                          <p className="mt-2 rounded bg-muted p-2 italic">
                            "{task.context}"
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 min-h-0 mt-4">
          <div className="h-full overflow-y-auto space-y-4 pr-2">
            {editedNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>No notes were extracted</p>
              </div>
            ) : (
              editedNotes.map((note, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedNotes.has(i)}
                      onCheckedChange={() => toggleNote(i)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-3">
                      <Input
                        value={note.title}
                        onChange={(e) =>
                          updateNote(i, { title: e.target.value })
                        }
                        className="font-medium"
                        placeholder="Note title"
                      />

                      <Textarea
                        value={note.content}
                        onChange={(e) =>
                          updateNote(i, { content: e.target.value })
                        }
                        rows={4}
                        placeholder="Note content"
                        className="font-mono text-sm"
                      />

                      <div className="flex flex-wrap gap-2">
                        {/* Confidence */}
                        {note.confidence !== undefined && (
                          <Badge variant="outline" className="gap-1">
                            <div
                              className={`h-2 w-2 rounded-full ${getConfidenceColor(note.confidence)}`}
                            />
                            {Math.round(note.confidence * 100)}%
                          </Badge>
                        )}

                        {/* Category */}
                        <Select
                          value={note.category || "insight"}
                          onValueChange={(value) =>
                            updateNote(i, { category: value })
                          }
                        >
                          <SelectTrigger className="h-7 w-auto border-0 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_LABELS).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[value]}`}
                                  >
                                    {label}
                                  </span>
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>

                        {/* Project Assignment */}
                        {projects.length > 0 && (
                          <Select
                            value={note.projectId?.toString() || "none"}
                            onValueChange={(value) =>
                              updateNote(i, {
                                projectId:
                                  value === "none"
                                    ? undefined
                                    : (value as Id<"projects">),
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-auto border-0 px-2">
                              <FolderOpen className="h-3.5 w-3.5 mr-1" />
                              <SelectValue placeholder="Project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Project</SelectItem>
                              {projects.map((project: any) => (
                                <SelectItem
                                  key={project._id}
                                  value={project._id}
                                >
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Context */}
                      {note.context && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Show context
                          </summary>
                          <p className="mt-2 rounded bg-muted p-2 italic">
                            "{note.context}"
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
