"use client";

import { Archive, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStatusChange: (status: string) => void;
  onBulkArchive: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkStatusChange,
  onBulkArchive,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-primary/10 border-b">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
        className="h-7 text-xs"
      >
        {selectedCount === totalCount ? (
          <>
            <X className="h-3 w-3 mr-1" />
            Clear
          </>
        ) : (
          <>
            <CheckSquare className="h-3 w-3 mr-1" />
            Select All
          </>
        )}
      </Button>

      <Select onValueChange={onBulkStatusChange}>
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue placeholder="Set Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="in-progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="wont-fix">Won't Fix</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={onBulkArchive}
        className="h-7 text-xs text-destructive hover:text-destructive"
      >
        <Archive className="h-3 w-3 mr-1" />
        Archive
      </Button>
    </div>
  );
}
