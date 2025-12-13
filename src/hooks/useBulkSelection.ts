import type { Id } from "@/convex/_generated/dataModel";
import { useCallback, useState } from "react";

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<Id<"messages">>>(
    new Set(),
  );

  const toggleSelection = useCallback((id: Id<"messages">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: Id<"messages">[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = useCallback(
    (id: Id<"messages">) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
