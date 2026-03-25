"use client";

import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";
import { AudioAttachment } from "./AudioAttachment";
import { FileAttachment } from "./FileAttachment";
import { ImageAttachment } from "./ImageAttachment";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  url?: string;
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
    <div className="flex gap-2 flex-wrap">
      <LazyMotion features={domAnimation}>
        <AnimatePresence mode="popLayout">
          {attachments.map((attachment, idx) => (
            <m.div
              key={`${attachment.storageId}-${attachment.name}`}
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
            </m.div>
          ))}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
