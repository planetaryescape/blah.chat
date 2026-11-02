import { FileIcon, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  size: number;
  mimeType: string;
}

interface AttachmentIndicatorsProps {
  attachments: Attachment[];
}

export function AttachmentIndicators({
  attachments,
}: AttachmentIndicatorsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {attachments.map((attachment, idx) => (
        <Badge
          key={idx}
          variant="secondary"
          className="flex items-center gap-1.5 py-1 px-2"
        >
          {attachment.type === "image" ? (
            <ImageIcon className="w-3 h-3" />
          ) : (
            <FileIcon className="w-3 h-3" />
          )}
          <span className="text-xs truncate max-w-[120px]">
            {attachment.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({(attachment.size / 1024).toFixed(0)}KB)
          </span>
        </Badge>
      ))}
    </div>
  );
}
