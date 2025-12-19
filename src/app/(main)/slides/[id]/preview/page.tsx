"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Presentation, Construction } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  const presentationId = unwrappedParams.id;
  const router = useRouter();
  const { showSlides } = useFeatureToggles();

  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const slides = useQuery(api.presentations.getSlides, { presentationId });

  if (!presentation) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/slides")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">{presentation.title}</h1>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {presentation.status === "outline_complete" && "Design pending"}
          {presentation.status === "design_generating" &&
            "Generating design..."}
          {presentation.status === "design_complete" && "Design ready"}
          {presentation.status === "slides_generating" &&
            "Generating slides..."}
          {presentation.status === "slides_complete" && "Complete"}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {presentation.status === "outline_complete" ? (
          <Card className="mx-auto max-w-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Construction className="mb-4 h-12 w-12 text-amber-500" />
              <h2 className="mb-2 text-xl font-semibold">
                Design System Generation
              </h2>
              <p className="mb-4 text-center text-muted-foreground">
                Phase 3 will implement design system generation.
                <br />
                Your outline has {slides?.length || 0} slides ready.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/slides/${presentationId}/outline`)}
              >
                Back to Outline
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slides?.map((slide) => (
              <Card key={slide._id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {slide.imageStorageId ? (
                    <span className="text-sm text-muted-foreground">
                      Image preview
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {slide.slideType === "title" && "Title Slide"}
                      {slide.slideType === "section" && "Section"}
                      {slide.slideType === "content" &&
                        `Slide ${slide.position}`}
                    </span>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="line-clamp-1 text-sm font-medium">
                    {slide.title}
                  </h3>
                  <p className="line-clamp-2 mt-1 text-xs text-muted-foreground">
                    {slide.content || "No content"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
