import { useState } from "react";
import { analytics } from "@/lib/analytics";

export function useComparisonMode() {
  const [isActive, setIsActive] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(
    null,
  );

  const startComparison = (models: string[]) => {
    if (models.length < 2) {
      throw new Error("Select at least 2 models");
    }
    if (models.length > 4) {
      throw new Error("Maximum 4 models allowed");
    }
    setSelectedModels(models);
    setIsActive(true);

    // Track comparison started
    analytics.track("comparison_started", {
      modelCount: models.length,
      models: models.join(","),
    });
  };

  const exitComparison = () => {
    setIsActive(false);
    setSelectedModels([]);
    setActiveComparisonId(null);

    // Track comparison exited
    analytics.track("comparison_exited", {
      hadActiveComparison: !!activeComparisonId,
    });
  };

  return {
    isActive,
    selectedModels,
    activeComparisonId,
    startComparison,
    exitComparison,
    setActiveComparisonId,
  };
}
