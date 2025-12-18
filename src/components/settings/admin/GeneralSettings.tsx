"use client";

import { AdminTranscriptProviderSettings } from "./AdminTranscriptProviderSettings";

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          General Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Platform-wide settings and integrations
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Integrations</h3>
          <AdminTranscriptProviderSettings />
        </div>
      </div>
    </div>
  );
}
