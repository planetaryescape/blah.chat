/**
 * Composio integration definitions
 *
 * Simplified to Google services + GitHub for production OAuth reliability.
 * Uses custom OAuth apps configured in Composio dashboard.
 *
 * To add more integrations:
 * 1. Create OAuth app for the provider
 * 2. Configure in Composio dashboard with custom auth
 * 3. Add to INTEGRATIONS array below
 */

export type IntegrationCategory = "google" | "development";

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  iconUrl?: string;
}

export const INTEGRATION_CATEGORIES: Record<
  IntegrationCategory,
  { label: string; order: number }
> = {
  google: { label: "Google", order: 1 },
  development: { label: "Development", order: 2 },
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  // ==================== GOOGLE SERVICES ====================
  // All use same Google OAuth app with combined scopes
  {
    id: "gmail",
    name: "Gmail",
    description: "Email management",
    category: "google",
  },
  {
    id: "googlecalendar",
    name: "Google Calendar",
    description: "Scheduling & events",
    category: "google",
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description: "File storage",
    category: "google",
  },
  {
    id: "googledocs",
    name: "Google Docs",
    description: "Documents",
    category: "google",
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    description: "Spreadsheets",
    category: "google",
  },
  {
    id: "googleslides",
    name: "Google Slides",
    description: "Presentations",
    category: "google",
  },
  {
    id: "googletasks",
    name: "Google Tasks",
    description: "Task management",
    category: "google",
  },
  {
    id: "googlephotos",
    name: "Google Photos",
    description: "Photo storage",
    category: "google",
  },
  {
    id: "googlemaps",
    name: "Google Maps",
    description: "Maps & places",
    category: "google",
  },

  // ==================== DEVELOPMENT ====================
  {
    id: "github",
    name: "GitHub",
    description: "Code hosting, issues, PRs",
    category: "development",
  },
];

export const INTEGRATIONS_BY_ID = new Map(INTEGRATIONS.map((i) => [i.id, i]));

export const INTEGRATIONS_BY_CATEGORY = INTEGRATIONS.reduce(
  (acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  },
  {} as Record<IntegrationCategory, IntegrationDefinition[]>,
);
