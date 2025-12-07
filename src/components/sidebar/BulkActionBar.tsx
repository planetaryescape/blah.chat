import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Edit, Pin, Star, Trash2, X } from "lucide-react";
import { useState } from "react";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onStar: () => void;
  onUnstar: () => void;
  onAutoRename: () => void;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onArchive,
  onPin,
  onUnpin,
  onStar,
  onUnstar,
  onAutoRename,
  className,
}: BulkActionBarProps) {
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    setIsRenaming(true);
    try {
      await onAutoRename();
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "animate-in slide-in-from-top-2 fade-in-0 duration-200",
        className,
      )}
    >
      {/* Row 1: Selection Info & Cancel */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground pl-1">
          {selectedCount} selected
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-muted -mr-1"
          onClick={onClearSelection}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>

      {/* Row 2: Actions */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                onClick={onPin}
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pin/Unpin all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-yellow-500/10 hover:text-yellow-500"
                onClick={onStar}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Star/Unstar all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted"
                onClick={handleRename}
                disabled={isRenaming}
              >
                <Edit
                  className={cn("h-3.5 w-3.5", isRenaming && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto-rename</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 border-l pl-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
