"use client";

import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FeedbackType,
  PRIORITY_CONFIG,
  type Priority,
  STATUS_BY_TYPE,
  STATUS_LABELS,
  TYPE_CONFIG,
} from "@/lib/constants/feedback";
import { cn } from "@/lib/utils";

// Triage Panel Component
function TriagePanel({
  feedback,
  onAcceptTriage,
}: {
  feedback: any;
  onAcceptTriage: (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => void;
}) {
  const triage = feedback.aiTriage;
  if (!triage) return null;

  return (
    <div className="bg-muted/30 border rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500 fill-violet-500/10" />
        <h3 className="font-medium text-sm">AI Triage Suggestion</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(triage.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="grid gap-3 text-sm">
        {/* Priority Suggestion */}
        {triage.suggestedPriority &&
          triage.suggestedPriority !== feedback.priority && (
            <div className="flex items-center justify-between bg-background p-2 rounded border">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <Badge
                  variant="outline"
                  className={
                    PRIORITY_CONFIG[triage.suggestedPriority as Priority]?.color
                  }
                >
                  {PRIORITY_CONFIG[triage.suggestedPriority as Priority]?.label}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
                onClick={() => onAcceptTriage({ acceptPriority: true })}
              >
                Accept
              </Button>
            </div>
          )}

        {/* Tags Suggestion */}
        {triage.suggestedTags && triage.suggestedTags.length > 0 && (
          <div className="flex items-start justify-between bg-background p-2 rounded border">
            <div className="flex-1">
              <span className="text-muted-foreground block mb-1 text-xs">
                Suggested Tags:
              </span>
              <div className="flex flex-wrap gap-1">
                {triage.suggestedTags.map((tag: string) => {
                  const isExisting = feedback.tags?.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isExisting ? "secondary" : "outline"}
                      className={cn("text-[10px]", isExisting && "opacity-50")}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-6 text-xs mt-1 shrink-0 ml-2 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
              onClick={() => onAcceptTriage({ acceptTags: true })}
            >
              Add Tags
            </Button>
          </div>
        )}

        {/* Analysis */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {triage.sentiment && (
            <div className="bg-background p-2 rounded border">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">
                Sentiment
              </span>
              <span className="capitalize">{triage.sentiment}</span>
            </div>
          )}
          {triage.category && (
            <div className="bg-background p-2 rounded border">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">
                Category
              </span>
              <span className="capitalize">{triage.category}</span>
            </div>
          )}
        </div>

        {/* Triage Notes */}
        {triage.triageNotes && (
          <div className="bg-background p-2 rounded border text-muted-foreground text-xs leading-relaxed">
            {triage.triageNotes.split(" | ").map((note: string, i: number) => (
              <p key={i} className="mb-1 last:mb-0">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeedbackDetail({
  feedback,
  onStatusChange,
  onPriorityChange,
  onAcceptTriage,
}: {
  feedback: any;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: Priority) => void;
  onAcceptTriage: (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => void;
}) {
  const feedbackType = feedback.feedbackType as FeedbackType;
  const availableStatuses = STATUS_BY_TYPE[feedbackType] || [];

  return (
    <div className="space-y-6">
      {/* AI Triage Panel */}
      <TriagePanel feedback={feedback} onAcceptTriage={onAcceptTriage} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{feedback.userName}</h2>
            {feedback.feedbackType && (
              <Badge
                variant="outline"
                className={cn("gap-1", TYPE_CONFIG[feedbackType]?.color)}
              >
                {TYPE_CONFIG[feedbackType]?.icon}
                {TYPE_CONFIG[feedbackType]?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{feedback.userEmail}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted{" "}
            {formatDistanceToNow(new Date(feedback.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Status & Priority controls */}
        <div className="flex gap-2">
          <Select
            value={feedback.priority || "none"}
            onValueChange={onPriorityChange as any}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">🔴 Critical</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="none">⚪ None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={feedback.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status] || status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Page</h3>
        <a
          href={feedback.page}
          className="text-sm text-primary hover:underline"
        >
          {feedback.page}
        </a>
      </div>

      {/* User suggested urgency */}
      {feedback.userSuggestedUrgency && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            User Suggested Urgency
          </h3>
          <Badge variant="outline">{feedback.userSuggestedUrgency}</Badge>
        </div>
      )}

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Feedback
        </h3>
        <p className="whitespace-pre-wrap">{feedback.description}</p>
      </div>

      {/* What they did */}
      {feedback.whatTheyDid && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they were trying to do
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyDid}</p>
        </div>
      )}

      {/* What they saw */}
      {feedback.whatTheySaw && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they saw
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheySaw}</p>
        </div>
      )}

      {/* What they expected */}
      {feedback.whatTheyExpected && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they expected
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyExpected}</p>
        </div>
      )}

      {/* Tags */}
      {feedback.tags && feedback.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {feedback.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot */}
      {feedback.screenshotUrl ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Screenshot
          </h3>
          <a
            href={feedback.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={feedback.screenshotUrl}
              alt="Feedback screenshot"
              className="max-w-full rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            />
          </a>
        </div>
      ) : null}

      {/* Error Context (for system-generated feedback) */}
      {feedback.errorContext && (
        <ErrorContextPanel errorContext={feedback.errorContext} />
      )}
    </div>
  );
}

// Error Context Panel for system-generated feedback
function ErrorContextPanel({ errorContext }: { errorContext: any }) {
  return (
    <div className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-500">⚠️</span>
        <h3 className="font-medium text-sm text-red-700 dark:text-red-400">
          System Error Context
        </h3>
      </div>

      <div className="grid gap-3 text-sm">
        {/* Error Type */}
        {errorContext.errorType && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Error Type:</span>
            <Badge variant="destructive" className="font-mono text-xs">
              {errorContext.errorType}
            </Badge>
          </div>
        )}

        {/* Model ID */}
        {errorContext.modelId && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Model:</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
              {errorContext.modelId}
            </code>
          </div>
        )}

        {/* Failed Models */}
        {errorContext.failedModels && errorContext.failedModels.length > 0 && (
          <div>
            <span className="text-muted-foreground block mb-1">
              Failed Models:
            </span>
            <div className="flex flex-wrap gap-1">
              {errorContext.failedModels.map((model: string) => (
                <Badge
                  key={model}
                  variant="outline"
                  className="font-mono text-xs bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800"
                >
                  {model}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorContext.errorMessage && (
          <div>
            <span className="text-muted-foreground block mb-1">
              Error Message:
            </span>
            <pre className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
              {errorContext.errorMessage}
            </pre>
          </div>
        )}

        {/* Conversation Link */}
        {errorContext.conversationId && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Conversation:</span>
            <a
              href={`/chat/${errorContext.conversationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              View conversation ↗
            </a>
          </div>
        )}

        {/* Environment */}
        {errorContext.environment && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Environment:</span>
            <Badge variant="secondary" className="text-xs">
              {errorContext.environment}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
