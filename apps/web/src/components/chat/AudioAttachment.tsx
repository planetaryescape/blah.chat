"use client";

import { Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  url?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  return (
    <div className="relative group flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-violet-600/10 border border-violet-500/20">
      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
        <Mic className="w-3.5 h-3.5 text-violet-400" />
      </div>

      <div className="max-w-[100px] min-w-0">
        <p className="text-xs font-medium truncate text-foreground/90">
          {attachment.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatSize(attachment.size)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-500/20"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
