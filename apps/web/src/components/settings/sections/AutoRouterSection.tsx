"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface AutoRouterSectionProps {
  costBias: number;
  speedBias: number;
  enableModelRecommendations: boolean;
  onCostBiasChange: (value: number) => Promise<void>;
  onSpeedBiasChange: (value: number) => Promise<void>;
  onEnableModelRecommendationsChange: (checked: boolean) => Promise<void>;
}

export function AutoRouterSection({
  costBias,
  speedBias,
  enableModelRecommendations,
  onCostBiasChange,
  onSpeedBiasChange,
  onEnableModelRecommendationsChange,
}: AutoRouterSectionProps) {
  return (
    <AccordionItem value="auto-router">
      <AccordionTrigger>Auto Router</AccordionTrigger>
      <AccordionContent className="space-y-6 pt-4">
        <p className="text-sm text-muted-foreground">
          When using Auto mode, these preferences influence which model is
          selected for each message.
        </p>

        {/* Cost Bias Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="cost-bias">Cost Preference</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {costBias}%
            </span>
          </div>
          <Slider
            id="cost-bias"
            value={[costBias]}
            min={0}
            max={100}
            step={5}
            onValueCommit={(value) => onCostBiasChange(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Quality focus</span>
            <span>Cost savings</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher values favor cheaper models. Lower values prioritize quality
            regardless of cost.
          </p>
        </div>

        {/* Speed Bias Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="speed-bias">Speed Preference</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {speedBias}%
            </span>
          </div>
          <Slider
            id="speed-bias"
            value={[speedBias]}
            min={0}
            max={100}
            step={5}
            onValueCommit={(value) => onSpeedBiasChange(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Quality focus</span>
            <span>Faster responses</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Higher values favor faster models (Cerebras, Groq). Lower values
            prioritize quality over speed.
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">How Auto Router works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Analyzes each message to classify the task type</li>
            <li>
              Considers model strengths for coding, reasoning, creative, etc.
            </li>
            <li>Applies your cost/speed preferences to the scoring</li>
            <li>Selects the optimal model for each specific message</li>
          </ul>
        </div>

        {/* Model Recommendations Toggle */}
        <div
          id="setting-enableModelRecommendations"
          className="flex items-center justify-between pt-4 border-t"
        >
          <div className="space-y-0.5">
            <Label htmlFor="enable-model-recommendations">
              Model recommendations
            </Label>
            <p className="text-xs text-muted-foreground">
              Show suggestions for cheaper models when using expensive ones
            </p>
          </div>
          <Switch
            id="enable-model-recommendations"
            checked={enableModelRecommendations}
            onCheckedChange={onEnableModelRecommendationsChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
