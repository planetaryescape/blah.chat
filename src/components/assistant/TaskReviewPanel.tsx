"use client";

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
import { Textarea } from "@/components/ui/textarea";

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
    timestampSeconds?: number;
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
    new Set(tasks.map((_, i) => i)),
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

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="shrink-0 flex items-center justify-between">
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
              const confirmed = editedTasks.filter((_, i) =>
                selectedTasks.has(i),
              );
              onConfirm(confirmed);
            }}
            disabled={selectedTasks.size === 0}
          >
            Confirm {selectedTasks.size} Tasks
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
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
                    onChange={(e) =>
                      updateTask(i, { description: e.target.value })
                    }
                    rows={2}
                    placeholder="Description"
                  />
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Confidence */}
                  {task.sourceContext?.confidence !== undefined && (
                    <Badge variant="outline" className="gap-1">
                      <div
                        className={`h-2 w-2 rounded-full ${getConfidenceColor(
                          task.sourceContext.confidence,
                        )}`}
                      />
                      {Math.round(task.sourceContext.confidence * 100)}% confident
                    </Badge>
                  )}

                  {/* Urgency */}
                  {task.urgency && (
                    <Select
                      value={task.urgency}
                      onValueChange={(value: any) =>
                        updateTask(i, { urgency: value })
                      }
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
                {task.sourceContext?.snippet && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Show context
                    </summary>
                    <p className="mt-2 rounded bg-muted p-2 italic">
                      "{task.sourceContext.snippet}"
                    </p>
                  </details>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
