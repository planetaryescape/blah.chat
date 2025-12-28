/**
 * File utility functions ported from web app.
 */

export interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

export const fileTypeColors: Record<string, string> = {
  pdf: "#ef4444", // red
  doc: "#3b82f6", // blue
  docx: "#3b82f6",
  xls: "#22c55e", // green
  xlsx: "#22c55e",
  csv: "#22c55e",
  txt: "#71717a", // zinc
  default: "#a1a1aa",
};

export function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileTypeColor(name: string): string {
  const ext = getFileExtension(name);
  return fileTypeColors[ext] || fileTypeColors.default;
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

export function getAttachmentType(
  mimeType: string,
): "image" | "audio" | "file" {
  if (isImageMimeType(mimeType)) return "image";
  if (isAudioMimeType(mimeType)) return "audio";
  return "file";
}
