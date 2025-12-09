import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { MemoriesClientPage } from "@/components/memories/MemoriesClientPage";

export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MemoriesClientPage />
    </Suspense>
  );
}
