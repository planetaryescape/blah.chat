"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { NotesWorkspace } from "@/components/notes/NotesWorkspace";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

export function NotesPageClient() {
  const { showNotes, isLoading } = useFeatureToggles();

  if (isLoading) {
    return <FeatureLoadingScreen />;
  }

  if (!showNotes) {
    return <DisabledFeaturePage featureName="Notes" settingKey="showNotes" />;
  }

  return <NotesWorkspace />;
}
