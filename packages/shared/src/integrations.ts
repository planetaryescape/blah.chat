/**
 * Composio integration definitions
 *
 * 50 curated integrations organized by category for Settings UI
 * Focused on the most commonly used and high-value integrations
 *
 * Note: Max active integrations is configurable via Admin Settings.
 * Default is 5, which limits tool count to ~50-100 tools max.
 */

export type IntegrationCategory =
  | "development"
  | "communication"
  | "productivity"
  | "data"
  | "crm"
  | "finance"
  | "automation"
  | "marketing"
  | "design"
  | "google";

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
  google: { label: "Google Services", order: 1 },
  development: { label: "Development", order: 2 },
  communication: { label: "Communication", order: 3 },
  productivity: { label: "Productivity", order: 4 },
  data: { label: "Data & Storage", order: 5 },
  crm: { label: "CRM & Sales", order: 6 },
  finance: { label: "Finance", order: 7 },
  marketing: { label: "Marketing & Social", order: 8 },
  design: { label: "Design", order: 9 },
  automation: { label: "Automation", order: 10 },
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  // ==================== GOOGLE SERVICES (9) ====================
  {
    id: "gmail",
    name: "Gmail",
    description: "Email management & automation",
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
    description: "File storage & sharing",
    category: "google",
  },
  {
    id: "googledocs",
    name: "Google Docs",
    description: "Document collaboration",
    category: "google",
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    description: "Spreadsheets & data",
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
    description: "Photo storage & organization",
    category: "google",
  },
  {
    id: "googlemaps",
    name: "Google Maps",
    description: "Maps, places & directions",
    category: "google",
  },

  // ==================== DEVELOPMENT (8) ====================
  {
    id: "github",
    name: "GitHub",
    description: "Code hosting, issues, PRs",
    category: "development",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "DevOps platform",
    category: "development",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking & planning",
    category: "development",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project management",
    category: "development",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Docs, wikis & databases",
    category: "development",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking",
    category: "development",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deployments & hosting",
    category: "development",
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design collaboration",
    category: "development",
  },

  // ==================== COMMUNICATION (7) ====================
  {
    id: "slack",
    name: "Slack",
    description: "Team messaging",
    category: "communication",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Community chat & voice",
    category: "communication",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Instant messaging",
    category: "communication",
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Video meetings",
    category: "communication",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Team collaboration",
    category: "communication",
  },
  {
    id: "whatsappbusiness",
    name: "WhatsApp Business",
    description: "Business messaging",
    category: "communication",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Video platform",
    category: "communication",
  },

  // ==================== PRODUCTIVITY (6) ====================
  {
    id: "trello",
    name: "Trello",
    description: "Kanban boards",
    category: "productivity",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Work management",
    category: "productivity",
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Task tracking",
    category: "productivity",
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Spreadsheet database",
    category: "productivity",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Scheduling automation",
    category: "productivity",
  },
  {
    id: "clickup",
    name: "ClickUp",
    description: "Project management",
    category: "productivity",
  },

  // ==================== DATA & STORAGE (4) ====================
  {
    id: "dropbox",
    name: "Dropbox",
    description: "File storage & sync",
    category: "data",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Microsoft cloud storage",
    category: "data",
  },
  {
    id: "firebase",
    name: "Firebase",
    description: "App development platform",
    category: "data",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Database",
    category: "data",
  },

  // ==================== CRM & SALES (5) ====================
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM & marketing",
    category: "crm",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM",
    category: "crm",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sales CRM",
    category: "crm",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Customer support",
    category: "crm",
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Customer messaging",
    category: "crm",
  },

  // ==================== FINANCE (4) ====================
  {
    id: "stripe",
    name: "Stripe",
    description: "Payments & billing",
    category: "finance",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Accounting",
    category: "finance",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Payment processing",
    category: "finance",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Cloud accounting",
    category: "finance",
  },

  // ==================== MARKETING & SOCIAL (4) ====================
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Social media",
    category: "marketing",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional network",
    category: "marketing",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Email marketing",
    category: "marketing",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Photo & video sharing",
    category: "marketing",
  },

  // ==================== DESIGN (1) ====================
  {
    id: "canva",
    name: "Canva",
    description: "Graphic design",
    category: "design",
  },

  // ==================== AUTOMATION (2) ====================
  {
    id: "zapier",
    name: "Zapier",
    description: "Workflow automation",
    category: "automation",
  },
  {
    id: "make",
    name: "Make",
    description: "Visual automation",
    category: "automation",
  },
];

// Total: 50 integrations
// Google (9) + Development (8) + Communication (7) + Productivity (6) +
// Data (4) + CRM (5) + Finance (4) + Marketing (4) + Design (1) + Automation (2)

// Create a lookup map for quick access by ID
export const INTEGRATIONS_BY_ID = new Map<string, IntegrationDefinition>(
  INTEGRATIONS.map((integration) => [integration.id, integration]),
);
