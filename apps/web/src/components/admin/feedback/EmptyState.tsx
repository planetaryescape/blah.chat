import { Filter, MessageSquare } from "lucide-react";

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      {hasFilters ? (
        <>
          <Filter className="h-12 w-12 mb-4" />
          <p>No feedback matches your filters</p>
        </>
      ) : (
        <>
          <MessageSquare className="h-12 w-12 mb-4" />
          <p>No feedback yet</p>
        </>
      )}
    </div>
  );
}
