import { BookOpen, FileText, Globe, Youtube } from "lucide-react";
import type { SourceStatus, SourceType } from "./types";

export const SOURCE_ICONS: Record<SourceType, typeof FileText> = {
  file: FileText,
  text: BookOpen,
  web: Globe,
  youtube: Youtube,
};

export const TYPE_CONFIG: Record<
  SourceType,
  { label: string; icon: typeof FileText; order: number }
> = {
  file: { label: "Files", icon: FileText, order: 0 },
  text: { label: "Text Notes", icon: BookOpen, order: 1 },
  web: { label: "Web Pages", icon: Globe, order: 2 },
  youtube: { label: "YouTube Videos", icon: Youtube, order: 3 },
};

export const TYPE_LABELS: Record<SourceType, string> = {
  file: "Document",
  text: "Text Note",
  web: "Web Page",
  youtube: "YouTube Video",
};

export const STATUS_STYLES: Record<SourceStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  processing: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
};
