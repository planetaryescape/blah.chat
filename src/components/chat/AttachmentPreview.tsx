"use client";

import { Button } from "@/components/ui/button";
import { X, FileIcon, Image as ImageIcon } from "lucide-react";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  return (
    <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
      {attachments.map((attachment, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 p-2 bg-secondary rounded-lg min-w-0"
        >
          {attachment.type === "image" ? (
            <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="text-sm truncate max-w-[150px] min-w-0">
            <p className="font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(idx)}
            className="h-6 w-6 p-0 flex-shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Remove attachment</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
