"use client";

import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { MemoriesClientPage } from "@/components/memories/MemoriesClientPage";

export default function MemoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MemoriesClientPage />
    </Suspense>
  );
}
