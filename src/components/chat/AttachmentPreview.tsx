"use client";

import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Mic,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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
    return FileSpreadsheet;
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    ["doc", "docx", "txt", "pdf"].includes(ext)
  ) {
    return FileText;
  }
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <AnimatePresence mode="popLayout">
        {attachments.map((attachment, idx) => (
          <motion.div
            key={`${attachment.storageId}-${idx}`}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{
              duration: 0.2,
              delay: idx * 0.05,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {attachment.type === "image" ? (
              <ImageAttachment
                attachment={attachment}
                onRemove={() => onRemove(idx)}
              />
            ) : attachment.type === "audio" ? (
              <AudioAttachment
                attachment={attachment}
                onRemove={() => onRemove(idx)}
              />
            ) : (
              <FileAttachment
                attachment={attachment}
                onRemove={() => onRemove(idx)}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ImageAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  // @ts-ignore - Type depth exceeded
  const url = useQuery(api.files.getFileUrl, {
    storageId: attachment.storageId as Id<"_storage">,
  });

  return (
    <div className="relative group overflow-hidden rounded-xl w-16 h-16 bg-muted/30 border border-border/30">
      {url ? (
        <img
          src={url}
          alt={attachment.name}
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Size badge */}
      <span className="absolute bottom-1 left-1 text-[10px] text-white/80 bg-black/40 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {formatSize(attachment.size)}
      </span>
    </div>
  );
}

function AudioAttachment({
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

function FileAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const ext = getFileExtension(attachment.name);
  const colorClass = fileTypeColors[ext] || fileTypeColors.default;
  const Icon = getFileIcon(attachment.mimeType, attachment.name);

  return (
    <div
      className={cn(
        "relative group flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r border",
        colorClass,
      )}
    >
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />

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
