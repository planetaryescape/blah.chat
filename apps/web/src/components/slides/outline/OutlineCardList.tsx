"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";
import { OutlineCard } from "./OutlineCard";

interface OutlineCardListProps {
  presentationId: Id<"presentations">;
  items: Doc<"outlineItems">[];
  onItemsReorder: (items: Doc<"outlineItems">[]) => void;
  onFeedbackChange: (itemId: Id<"outlineItems">, feedback: string) => void;
  isLoading?: boolean;
}

export function OutlineCardList({
  presentationId,
  items,
  onItemsReorder,
  onFeedbackChange,
  isLoading = false,
}: OutlineCardListProps) {
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updatePositions = useMutation(api.outlineItems.updatePositions);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = items.findIndex((item) => item._id === active.id);
      const newIndex = items.findIndex((item) => item._id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Optimistically update UI
      const newItems = arrayMove(items, oldIndex, newIndex);
      onItemsReorder(newItems);

      // Build position updates (1-indexed)
      const positions = newItems.map((item, index) => ({
        itemId: item._id,
        position: index + 1,
      }));

      // Persist to DB
      try {
        await updatePositions({
          presentationId,
          positions,
        });
      } catch (error) {
        console.error("Failed to update positions:", error);
        // Revert on error
        onItemsReorder(items);
      }
    },
    [items, onItemsReorder, presentationId, updatePositions],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No outline items yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          The AI is generating your presentation outline...
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item._id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <OutlineCard
              key={item._id}
              item={item}
              index={index}
              onFeedbackChange={onFeedbackChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
