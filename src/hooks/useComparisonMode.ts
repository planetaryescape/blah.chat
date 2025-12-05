import { useState } from "react";

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
  };

  const exitComparison = () => {
    setIsActive(false);
    setSelectedModels([]);
    setActiveComparisonId(null);
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
