import { SearchX, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SearchEmptyStateProps {
  query: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function SearchEmptyState({
  query,
  hasFilters = false,
  onClearFilters,
}: SearchEmptyStateProps) {
  return (
    <Card className="border-dashed border-2 border-border/40 bg-transparent">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="relative mb-4">
          <SearchX className="w-16 h-16 text-muted-foreground/50" />
          <div className="absolute -right-2 -top-2 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-xl">😕</span>
          </div>
        </div>

        <h3 className="text-lg font-medium mb-2">No results found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          No messages match{" "}
          <span className="font-mono font-semibold">"{query}"</span>
        </p>

        <div className="space-y-3 w-full max-w-sm">
          <div className="text-xs text-muted-foreground text-left space-y-2">
            <p className="font-medium">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check spelling and try different keywords</li>
              {!hasFilters && (
                <li className="flex items-center gap-1">
                  Try <Sparkles className="w-3 h-3 inline text-primary" />{" "}
                  <span className="font-medium">Hybrid Search</span> in settings
                </li>
              )}
              {hasFilters && <li>Remove filters to broaden search</li>}
              <li>Search for common words or phrases</li>
            </ul>
          </div>

          {hasFilters && onClearFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="w-full"
            >
              <Filter className="w-3 h-3 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
