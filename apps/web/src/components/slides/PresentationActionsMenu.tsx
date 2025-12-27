"use client";

import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  Pin,
  RefreshCw,
  RotateCcw,
  Star,
  StopCircle,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

interface PresentationMenuAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

type PresentationWithStats = Doc<"presentations"> & {
  thumbnailStorageId?: Id<"_storage">;
  thumbnailStatus?: string;
  stats: {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
};

interface GetPresentationMenuItemsOptions {
  presentation: PresentationWithStats;
  onStopGeneration: () => void;
  onRestartGeneration: () => void;
  onRegenerateDescription: () => void;
  onTogglePin: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}

export function getPresentationMenuItems({
  presentation,
  onStopGeneration,
  onRestartGeneration,
  onRegenerateDescription,
  onTogglePin,
  onToggleStar,
  onDelete,
}: GetPresentationMenuItemsOptions): PresentationMenuAction[] {
  const isGenerating = ["slides_generating", "design_generating"].includes(
    presentation.status,
  );
  const canRestart = [
    "error",
    "stopped",
    "design_complete",
    "outline_complete",
  ].includes(presentation.status);

  const items: PresentationMenuAction[] = [];

  if (isGenerating) {
    items.push({
      id: "stop",
      icon: <StopCircle className="mr-2 h-4 w-4" />,
      label: "Stop Generation",
      onClick: onStopGeneration,
    });
  }

  if (canRestart) {
    items.push({
      id: "restart",
      icon: <RotateCcw className="mr-2 h-4 w-4" />,
      label: "Restart Generation",
      onClick: onRestartGeneration,
    });
  }

  if (!presentation.description) {
    items.push({
      id: "description",
      icon: <RefreshCw className="mr-2 h-4 w-4" />,
      label: "Generate Description",
      onClick: onRegenerateDescription,
    });
  }

  items.push(
    {
      id: "pin",
      icon: <Pin className="mr-2 h-4 w-4" />,
      label: presentation.pinned ? "Unpin" : "Pin",
      onClick: onTogglePin,
    },
    {
      id: "star",
      icon: <Star className="mr-2 h-4 w-4" />,
      label: presentation.starred ? "Unstar" : "Star",
      onClick: onToggleStar,
    },
    {
      id: "delete",
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      label: "Delete",
      onClick: onDelete,
      destructive: true,
    },
  );

  return items;
}

export type { PresentationMenuAction, PresentationWithStats };
