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
      console.warn("Cannot start comparison: Select at least 2 models");
      return false;
    }
    if (models.length > 4) {
      console.warn("Cannot start comparison: Maximum 4 models allowed");
      return false;
    }
    setSelectedModels(models);
    setIsActive(true);

    // Track comparison started
    analytics.track("comparison_started", {
      modelCount: models.length,
      models: models.join(","),
    });

    return true;
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
