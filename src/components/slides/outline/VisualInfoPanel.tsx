"use client";

import {
  Loader2,
  Palette,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface DesignSystem {
  theme: string;
  themeRationale: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPairings: {
    heading: string;
    body: string;
  };
  visualStyle: string;
  layoutPrinciples: string[];
  iconStyle: string;
  imageGuidelines: string;
  designInspiration: string;
}

interface VisualInfoPanelProps {
  designSystem?: DesignSystem | null;
  visualDirection?: string;
  isOpen: boolean;
  onToggle: () => void;
  isDesignGenerating?: boolean;
  isOutlineGenerating?: boolean;
}

export function VisualInfoPanel({
  designSystem,
  visualDirection,
  isOpen,
  onToggle,
  isDesignGenerating = false,
  isOutlineGenerating = false,
}: VisualInfoPanelProps) {
  if (!isOpen) {
    return (
      <div className="flex-shrink-0 border-l bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-14 w-10 rounded-none border-b"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 border-l flex flex-col bg-muted/10">
      <div className="h-14 px-4 border-b flex items-center justify-between bg-background">
        <h3 className="font-semibold text-sm">Visual Guidance</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Design System (if available) */}
          {designSystem ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design System
              </h4>
              <div className="space-y-3 text-sm">
                {/* Color Swatches */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded border shadow-sm"
                      style={{ backgroundColor: designSystem.primaryColor }}
                    />
                    <span className="text-muted-foreground">Primary</span>
                    <span className="text-xs font-mono ml-auto">
                      {designSystem.primaryColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded border shadow-sm"
                      style={{ backgroundColor: designSystem.secondaryColor }}
                    />
                    <span className="text-muted-foreground">Secondary</span>
                    <span className="text-xs font-mono ml-auto">
                      {designSystem.secondaryColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded border shadow-sm"
                      style={{ backgroundColor: designSystem.accentColor }}
                    />
                    <span className="text-muted-foreground">Accent</span>
                    <span className="text-xs font-mono ml-auto">
                      {designSystem.accentColor}
                    </span>
                  </div>
                </div>

                {/* Theme & Style */}
                <div className="pt-2 border-t space-y-1.5">
                  <p>
                    <span className="text-muted-foreground">Theme:</span>{" "}
                    {designSystem.theme}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Style:</span>{" "}
                    {designSystem.visualStyle}
                  </p>
                </div>

                {/* Fonts */}
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground mb-1">Typography</p>
                  <p className="text-xs">
                    <span className="font-medium">
                      {designSystem.fontPairings.heading}
                    </span>{" "}
                    / {designSystem.fontPairings.body}
                  </p>
                </div>
              </div>
            </div>
          ) : isDesignGenerating ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design System
              </h4>
              <div className="space-y-3">
                {/* Skeleton for color swatches */}
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="w-16 h-4" />
                      <Skeleton className="w-14 h-3 ml-auto" />
                    </div>
                  ))}
                </div>
                {/* Skeleton for theme/style */}
                <div className="pt-2 border-t space-y-2">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
                {/* Skeleton for fonts */}
                <div className="pt-2 border-t">
                  <Skeleton className="w-20 h-3 mb-2" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating design...</span>
              </div>
            </div>
          ) : isOutlineGenerating ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design System
              </h4>
              <p className="text-sm text-muted-foreground">
                Design will be generated after outline completes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Design System
              </h4>
              <p className="text-sm text-muted-foreground">
                No design system available.
              </p>
            </div>
          )}

          {/* Visual Direction for Selected Slide */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Slide Visual Direction
            </h4>
            {visualDirection ? (
              <p className="text-sm leading-relaxed">{visualDirection}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No visual direction for this slide.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This is the AI's plan for generating this slide's image. Use
              feedback to request changes.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
