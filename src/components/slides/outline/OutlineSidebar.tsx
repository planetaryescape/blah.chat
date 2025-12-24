"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface OutlineSidebarItemProps {
  item: Doc<"outlineItems">;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function OutlineSidebarItem({
  item,
  index,
  isSelected,
  onSelect,
}: OutlineSidebarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
        isSelected
          ? "bg-muted border-primary/50 shadow-sm"
          : "bg-card border-transparent hover:border-border",
        isDragging && "shadow-lg ring-2 ring-primary/20 bg-background",
      )}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 p-1 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4">
            {index + 1}
          </span>
          <h4
            className={cn(
              "text-sm font-medium truncate",
              !item.title && "text-muted-foreground italic",
            )}
          >
            {item.title || "Untitled Slide"}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
          {item.content?.split("\n")[0] || "No content"}
        </p>
      </div>
    </div>
  );
}

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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";

interface OutlineSidebarProps {
  presentationId: Id<"presentations">;
  items: Doc<"outlineItems">[];
  selectedItemId: Id<"outlineItems"> | null;
  onSelect: (itemId: Id<"outlineItems">) => void;
  onItemsReorder: (items: Doc<"outlineItems">[]) => void;
}

export function OutlineSidebar({
  presentationId,
  items,
  selectedItemId,
  onSelect,
  onItemsReorder,
}: OutlineSidebarProps) {
  // @ts-ignore - Type depth exceeded
  const updatePositions = useMutation(api.outlineItems.updatePositions);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
        onItemsReorder(items); // Revert
      }
    },
    [items, onItemsReorder, presentationId, updatePositions],
  );

  return (
    <div className="h-full flex flex-col bg-muted/10 border-r w-80">
      <div className="p-4 border-b bg-background/50 backdrop-blur">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Slides ({items.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item._id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item, index) => (
              <OutlineSidebarItem
                key={item._id}
                item={item}
                index={index}
                isSelected={selectedItemId === item._id}
                onSelect={() => onSelect(item._id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
