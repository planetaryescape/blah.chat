import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<Id<"messages">>>(
    new Set(),
  );

  const toggleSelection = (id: Id<"messages">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: Id<"messages">[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const isSelected = (id: Id<"messages">) => selectedIds.has(id);

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
