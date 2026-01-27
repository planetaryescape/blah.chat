/**
 * Composio integration definitions
 *
 * Top 50 integrations organized by category for Settings UI
 */

export type IntegrationCategory =
  | "development"
  | "communication"
  | "productivity"
  | "data"
  | "crm"
  | "finance"
  | "automation";

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
  development: { label: "Development", order: 1 },
  communication: { label: "Communication", order: 2 },
  productivity: { label: "Productivity", order: 3 },
  data: { label: "Data & Storage", order: 4 },
  crm: { label: "CRM & Sales", order: 5 },
  finance: { label: "Finance", order: 6 },
  automation: { label: "Automation", order: 7 },
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  // Development (10)
  {
    id: "github",
    name: "GitHub",
    description: "Repo management, issues, PRs",
    category: "development",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Git platform for DevOps",
    category: "development",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Atlassian git hosting",
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
    id: "sentry",
    name: "Sentry",
    description: "Error tracking & monitoring",
    category: "development",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deployments & hosting",
    category: "development",
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Web hosting & functions",
    category: "development",
  },
  {
    id: "circleci",
    name: "CircleCI",
    description: "CI/CD pipelines",
    category: "development",
  },
  {
    id: "docker",
    name: "Docker Hub",
    description: "Container registry",
    category: "development",
  },

  // Communication (8)
  {
    id: "gmail",
    name: "Gmail",
    description: "Email management",
    category: "communication",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Microsoft email",
    category: "communication",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team messaging",
    category: "communication",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Community chat",
    category: "communication",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Enterprise messaging",
    category: "communication",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Instant messaging",
    category: "communication",
  },
  {
    id: "whatsapp_business",
    name: "WhatsApp Business",
    description: "Customer messaging",
    category: "communication",
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Customer support",
    category: "communication",
  },

  // Productivity (12)
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Scheduling & events",
    category: "productivity",
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Microsoft calendar",
    category: "productivity",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Scheduling links",
    category: "productivity",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Notes & documentation",
    category: "productivity",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Task management",
    category: "productivity",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Kanban boards",
    category: "productivity",
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Work management",
    category: "productivity",
  },
  {
    id: "clickup",
    name: "ClickUp",
    description: "Project management",
    category: "productivity",
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Personal tasks",
    category: "productivity",
  },
  {
    id: "google_docs",
    name: "Google Docs",
    description: "Documents",
    category: "productivity",
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Team wiki",
    category: "productivity",
  },
  {
    id: "coda",
    name: "Coda",
    description: "Docs + apps",
    category: "productivity",
  },

  // Data & Storage (8)
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Spreadsheets",
    category: "data",
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Database & spreadsheet",
    category: "data",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "File storage",
    category: "data",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "File storage",
    category: "data",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Microsoft storage",
    category: "data",
  },
  {
    id: "box",
    name: "Box",
    description: "Enterprise storage",
    category: "data",
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Postgres database",
    category: "data",
  },
  {
    id: "mongodb",
    name: "MongoDB Atlas",
    description: "NoSQL database",
    category: "data",
  },

  // CRM & Sales (6)
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
    description: "Support tickets",
    category: "crm",
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    description: "Customer support",
    category: "crm",
  },
  {
    id: "apollo",
    name: "Apollo.io",
    description: "Sales intelligence",
    category: "crm",
  },

  // Finance & Payments (4)
  {
    id: "stripe",
    name: "Stripe",
    description: "Payments",
    category: "finance",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Accounting",
    category: "finance",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Accounting",
    category: "finance",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Payments",
    category: "finance",
  },

  // Automation (2)
  {
    id: "zapier",
    name: "Zapier",
    description: "Workflow automation",
    category: "automation",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "SMS & Voice",
    category: "automation",
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
