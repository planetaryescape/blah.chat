"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Presentation, Loader2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";

const statusLabels: Record<string, { label: string; color: string }> = {
  outline_pending: { label: "Pending", color: "text-muted-foreground" },
  outline_generating: { label: "Generating outline", color: "text-amber-500" },
  outline_complete: { label: "Outline ready", color: "text-blue-500" },
  design_generating: { label: "Creating design", color: "text-amber-500" },
  design_complete: { label: "Design ready", color: "text-blue-500" },
  slides_generating: { label: "Generating slides", color: "text-amber-500" },
  slides_complete: { label: "Complete", color: "text-green-500" },
  error: { label: "Error", color: "text-destructive" },
};

export default function SlidesPage() {
  const router = useRouter();
  const { showSlides } = useFeatureToggles();

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentations = useQuery(api.presentations.listByUser, {});

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slides</h1>
          <p className="mt-1 text-muted-foreground">
            Create AI-powered presentations
          </p>
        </div>
        <Button onClick={() => router.push("/slides/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Presentation
        </Button>
      </div>

      {presentations === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : presentations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Presentation className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No presentations yet</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create your first AI-powered presentation
            </p>
            <Button onClick={() => router.push("/slides/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Presentation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presentations.map((presentation) => {
            const status = statusLabels[presentation.status] || {
              label: presentation.status,
              color: "text-muted-foreground",
            };
            const href =
              presentation.status === "slides_complete"
                ? `/slides/${presentation._id}/preview`
                : `/slides/${presentation._id}/outline`;

            return (
              <Card
                key={presentation._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(href)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Presentation className="h-5 w-5 text-primary" />
                    <span className={`text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1 text-lg">
                    {presentation.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(presentation.createdAt, {
                        addSuffix: true,
                      })}
                    </div>
                    {presentation.totalSlides > 0 && (
                      <div>{presentation.totalSlides} slides</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
