"use client";

import { Eye, EyeOff, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MemoriesHeaderProps {
  showReasoning: boolean;
  onToggleReasoning: () => void;
  memoriesCount: number;
  isConsolidating: boolean;
  onConsolidate: () => void;
  onShowDeleteDialog: () => void;
}

/**
 * Header for the Memories page with title and action buttons.
 */
export function MemoriesHeader({
  showReasoning,
  onToggleReasoning,
  memoriesCount,
  isConsolidating,
  onConsolidate,
  onShowDeleteDialog,
}: MemoriesHeaderProps) {
  return (
    <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Memories</h1>
            <p className="text-sm text-muted-foreground">
              AI-extracted facts from your conversations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleReasoning}
              className="gap-2"
            >
              {showReasoning ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide reasoning
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show reasoning
                </>
              )}
            </Button>
            {memoriesCount > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={onConsolidate}
                    disabled={isConsolidating}
                  >
                    {isConsolidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Consolidating...
                      </>
                    ) : (
                      "Consolidate Memories"
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onShowDeleteDialog}
                    className="text-destructive"
                  >
                    Delete All Memories
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
