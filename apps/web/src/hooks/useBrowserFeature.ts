import { useEffect, useState } from "react";

export default function useBrowserFeature(featureName: string): boolean {
  const [hasFeature, setHasFeature] = useState(false);

  useEffect(() => {
    setHasFeature(typeof window !== "undefined" && featureName in window);
  }, [featureName]);

  return hasFeature;
}
