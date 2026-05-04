"use client";

import {
  Bookmark,
  Copy,
  FileText,
  GitBranch,
  type LucideIcon,
  RotateCcw,
} from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ActionStats {
  copy_message?: number;
  bookmark_message?: number;
  save_as_note?: number;
  branch_message?: number;
  regenerate_message?: number;
}

interface ActionItem {
  key: keyof ActionStats;
  icon: LucideIcon;
  label: string;
}

const ACTION_ITEMS: ActionItem[] = [
  { key: "copy_message", icon: Copy, label: "Messages Copied" },
  { key: "bookmark_message", icon: Bookmark, label: "Bookmarks Created" },
  { key: "save_as_note", icon: FileText, label: "Saved as Notes" },
  { key: "branch_message", icon: GitBranch, label: "Branches Created" },
  { key: "regenerate_message", icon: RotateCcw, label: "Regenerations" },
];

interface ActionUsageSectionProps {
  actionStats?: ActionStats;
}

export function ActionUsageSection({ actionStats }: ActionUsageSectionProps) {
  return (
    <AccordionItem value="actions" className="border rounded-lg px-4">
      <AccordionTrigger>Action Button Usage</AccordionTrigger>
      <AccordionContent className="pt-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTION_ITEMS.map(({ key, icon: Icon, label }) => (
            <ActionCard
              key={key}
              icon={Icon}
              label={label}
              count={actionStats?.[key] ?? 0}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ActionCard({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-lg border p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
