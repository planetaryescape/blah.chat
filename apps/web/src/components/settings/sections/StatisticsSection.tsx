"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface StatisticsSectionProps {
  showMessageStats: boolean;
  showComparisonStats: boolean;
  showSlideStats: boolean;
  showModelProvider: boolean;
  onMessageStatsChange: (checked: boolean) => Promise<void>;
  onComparisonStatsChange: (checked: boolean) => Promise<void>;
  onSlideStatsChange: (checked: boolean) => Promise<void>;
  onShowModelProviderChange: (checked: boolean) => Promise<void>;
}

export function StatisticsSection({
  showMessageStats,
  showComparisonStats,
  showSlideStats,
  showModelProvider,
  onMessageStatsChange,
  onComparisonStatsChange,
  onSlideStatsChange,
  onShowModelProviderChange,
}: StatisticsSectionProps) {
  return (
    <AccordionItem value="stats">
      <AccordionTrigger>Statistics</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-message-stats">Show message statistics</Label>
            <p className="text-sm text-muted-foreground">
              Display TTFT, TPS, and token counts below assistant messages
            </p>
          </div>
          <Switch
            id="show-message-stats"
            checked={showMessageStats}
            onCheckedChange={onMessageStatsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-comparison-stats">
              Show comparison statistics
            </Label>
            <p className="text-sm text-muted-foreground">
              Display performance metrics in comparison mode (tokens, cost,
              speed)
            </p>
          </div>
          <Switch
            id="show-comparison-stats"
            checked={showComparisonStats}
            onCheckedChange={onComparisonStatsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-slide-stats">Show slide statistics</Label>
            <p className="text-sm text-muted-foreground">
              Display generation cost and token usage for presentation slides
            </p>
          </div>
          <Switch
            id="show-slide-stats"
            checked={showSlideStats}
            onCheckedChange={onSlideStatsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-model-provider">Show model provider</Label>
            <p className="text-sm text-muted-foreground">
              Display which API provider routes each model (Vercel AI Gateway,
              OpenRouter)
            </p>
          </div>
          <Switch
            id="show-model-provider"
            checked={showModelProvider}
            onCheckedChange={onShowModelProviderChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
