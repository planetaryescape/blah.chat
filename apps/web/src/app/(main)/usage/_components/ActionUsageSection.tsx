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

type ActionStats = {
  copy_message?: number;
  bookmark_message?: number;
  save_as_note?: number;
  branch_message?: number;
  regenerate_message?: number;
};

interface ActionUsageSectionProps {
  actionStats?: ActionStats;
}

export function ActionUsageSection({ actionStats }: ActionUsageSectionProps) {
  const items: { icon: LucideIcon; count: number; label: string }[] = [
    {
      icon: Copy,
      count: actionStats?.copy_message ?? 0,
      label: "Messages Copied",
    },
    {
      icon: Bookmark,
      count: actionStats?.bookmark_message ?? 0,
      label: "Bookmarks Created",
    },
    {
      icon: FileText,
      count: actionStats?.save_as_note ?? 0,
      label: "Saved as Notes",
    },
    {
      icon: GitBranch,
      count: actionStats?.branch_message ?? 0,
      label: "Branches Created",
    },
    {
      icon: RotateCcw,
      count: actionStats?.regenerate_message ?? 0,
      label: "Regenerations",
    },
  ];

  return (
    <AccordionItem value="actions" className="border rounded-lg px-4">
      <AccordionTrigger>Action Button Usage</AccordionTrigger>
      <AccordionContent className="pt-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, count, label }) => (
            <div
              key={label}
              className="rounded-lg border p-4 flex items-center gap-3"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
