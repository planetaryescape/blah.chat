"use client";

import { FileIcon, FileSpreadsheet, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  url?: string;
}

const fileTypeColors: Record<string, string> = {
  pdf: "from-red-500/20 to-red-600/10 border-red-500/20",
  doc: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
  docx: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
  xls: "from-green-500/20 to-green-600/10 border-green-500/20",
  xlsx: "from-green-500/20 to-green-600/10 border-green-500/20",
  csv: "from-green-500/20 to-green-600/10 border-green-500/20",
  txt: "from-zinc-500/20 to-zinc-600/10 border-zinc-500/20",
  default: "from-muted/50 to-muted/30 border-border/50",
};

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getFileIcon(mimeType: string, name: string) {
  const ext = getFileExtension(name);

  if (
    mimeType.includes("spreadsheet") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return (
      <FileSpreadsheet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    );
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    ["doc", "docx", "txt", "pdf"].includes(ext)
  ) {
    return <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  }
  return <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const ext = getFileExtension(attachment.name);
  const colorClass = fileTypeColors[ext] || fileTypeColors.default;

  return (
    <div
      className={cn(
        "relative group flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r border",
        colorClass,
      )}
    >
      {getFileIcon(attachment.mimeType, attachment.name)}

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
        className="h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
