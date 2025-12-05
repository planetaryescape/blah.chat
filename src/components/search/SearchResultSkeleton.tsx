import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SearchResultSkeleton() {
  return (
    <Card className="animate-pulse border-border/40 bg-background/50">
      <CardHeader>
        <div className="space-y-2">
          {/* Conversation badge */}
          <div className="h-5 w-32 bg-muted/50 rounded-full" />

          {/* Title */}
          <div className="h-6 w-3/4 bg-muted rounded" />

          {/* Metadata row */}
          <div className="flex gap-4 items-center">
            <div className="h-3 w-24 bg-muted/70 rounded" />
            <div className="h-3 w-16 bg-muted/70 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Snippet (2 lines) */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted/70 rounded" />
          <div className="h-4 w-5/6 bg-muted/70 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SearchResultSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            animationDelay: `${i * 75}ms`,
          }}
        >
          <SearchResultSkeleton />
        </div>
      ))}
    </div>
  );
}
