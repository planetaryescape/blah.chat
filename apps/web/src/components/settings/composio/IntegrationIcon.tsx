"use client";

import { useTheme } from "next-themes";
import type { SVGProps } from "react";

// Import all available svgl icons
import { Airtable } from "@/components/ui/svgs/airtable";
import { AsanaLogo } from "@/components/ui/svgs/asanaLogo";
import { Buffer } from "@/components/ui/svgs/buffer";
import { Calendly } from "@/components/ui/svgs/calendly";
import { Canva } from "@/components/ui/svgs/canva";
import { Clickup } from "@/components/ui/svgs/clickup";
import { Discord } from "@/components/ui/svgs/discord";
import { Dropbox } from "@/components/ui/svgs/dropbox";
import { Figma } from "@/components/ui/svgs/figma";
import { Firebase } from "@/components/ui/svgs/firebase";
import { GithubDark } from "@/components/ui/svgs/githubDark";
import { GithubLight } from "@/components/ui/svgs/githubLight";
import { Gitlab } from "@/components/ui/svgs/gitlab";
import { Gmail } from "@/components/ui/svgs/gmail";
import { Google } from "@/components/ui/svgs/google";
import { GoogleCalendar } from "@/components/ui/svgs/googleCalendar";
import { GoogleDocs } from "@/components/ui/svgs/googleDocs";
import { GoogleDrive } from "@/components/ui/svgs/googleDrive";
import { GoogleMaps } from "@/components/ui/svgs/googleMaps";
import { GooglePhotos } from "@/components/ui/svgs/googlePhotos";
import { GoogleSheets } from "@/components/ui/svgs/googleSheets";
import { GoogleSlides } from "@/components/ui/svgs/googleSlides";
import { GoogleTasks } from "@/components/ui/svgs/googleTasks";
import { Hubspot } from "@/components/ui/svgs/hubspot";
import { Instagram } from "@/components/ui/svgs/instagram";
import { Intercom } from "@/components/ui/svgs/intercom";
import { Jira } from "@/components/ui/svgs/jira";
import { Linear } from "@/components/ui/svgs/linear";
import { Linkedin } from "@/components/ui/svgs/linkedin";
import { Mailchimp } from "@/components/ui/svgs/mailchimp";
import { Make } from "@/components/ui/svgs/make";
import { Microsoft } from "@/components/ui/svgs/microsoft";
import { MicrosoftTeams } from "@/components/ui/svgs/microsoftTeams";
import { MongodbIconDark } from "@/components/ui/svgs/mongodbIconDark";
import { MongodbIconLight } from "@/components/ui/svgs/mongodbIconLight";
import { Notion } from "@/components/ui/svgs/notion";
import { Onedrive } from "@/components/ui/svgs/onedrive";
import { Paypal } from "@/components/ui/svgs/paypal";
import { Pipedrive } from "@/components/ui/svgs/pipedrive";
import { Quickbooks } from "@/components/ui/svgs/quickbooks";
import { Salesforce } from "@/components/ui/svgs/salesforce";
import { Sentry } from "@/components/ui/svgs/sentry";
import { Slack } from "@/components/ui/svgs/slack";
import { Stripe } from "@/components/ui/svgs/stripe";
import { Telegram } from "@/components/ui/svgs/telegram";
import { Todoist } from "@/components/ui/svgs/todoist";
import { Trello } from "@/components/ui/svgs/trello";
import { Vercel } from "@/components/ui/svgs/vercel";
import { VercelDark } from "@/components/ui/svgs/vercelDark";
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon";
import { X } from "@/components/ui/svgs/x";
import { Xero } from "@/components/ui/svgs/xero";
import { Youtube } from "@/components/ui/svgs/youtube";
import { Zapier } from "@/components/ui/svgs/zapier";
import { Zendesk } from "@/components/ui/svgs/zendesk";
import { Zoom } from "@/components/ui/svgs/zoom";

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.ReactNode;

interface ThemeAwareIcon {
  light: IconComponent;
  dark: IconComponent;
}

// Map integration IDs to svgl components
// IDs use lowercase without underscores (e.g., "googlecalendar" not "google_calendar")
const ICON_MAP: Record<string, IconComponent | ThemeAwareIcon> = {
  // Development
  github: { light: GithubLight, dark: GithubDark },
  gitlab: Gitlab,
  linear: Linear,
  jira: Jira,
  sentry: Sentry,
  vercel: { light: Vercel, dark: VercelDark },
  figma: Figma,

  // Communication
  gmail: Gmail,
  slack: Slack,
  discord: Discord,
  telegram: Telegram,
  zoom: Zoom,
  teams: MicrosoftTeams,
  whatsappbusiness: WhatsappIcon,

  // Google services (individual icons)
  googlecalendar: GoogleCalendar,
  googledrive: GoogleDrive,
  googledocs: GoogleDocs,
  googlesheets: GoogleSheets,
  googleslides: GoogleSlides,
  googletasks: GoogleTasks,
  googlephotos: GooglePhotos,
  googlemaps: GoogleMaps,
  youtube: Youtube,

  // Productivity
  trello: Trello,
  asana: AsanaLogo,
  todoist: Todoist,
  airtable: Airtable,
  calendly: Calendly,
  clickup: Clickup,
  notion: Notion,

  // Data & Storage
  dropbox: Dropbox,
  onedrive: Onedrive,
  firebase: Firebase,
  mongodb: { light: MongodbIconLight, dark: MongodbIconDark },

  // CRM & Sales
  hubspot: Hubspot,
  salesforce: Salesforce,
  pipedrive: Pipedrive,
  zendesk: Zendesk,
  intercom: Intercom,

  // Finance & Payments
  stripe: Stripe,
  quickbooks: Quickbooks,
  paypal: Paypal,
  xero: Xero,

  // Marketing & Social
  twitter: X,
  linkedin: Linkedin,
  mailchimp: Mailchimp,
  instagram: Instagram,

  // Design
  canva: Canva,

  // Automation
  zapier: Zapier,
  make: Make,
  buffer: Buffer,

  // Microsoft products fallback
  outlook: Microsoft,
  outlook_calendar: Microsoft,

  // Fallback for generic Google (if needed)
  google: Google,
};

interface IntegrationIconProps {
  integrationId: string;
  integrationName: string;
  className?: string;
}

function isThemeAwareIcon(
  icon: IconComponent | ThemeAwareIcon,
): icon is ThemeAwareIcon {
  return typeof icon === "object" && "light" in icon && "dark" in icon;
}

export function IntegrationIcon({
  integrationId,
  integrationName,
  className = "h-6 w-6",
}: IntegrationIconProps) {
  const { resolvedTheme } = useTheme();
  const icon = ICON_MAP[integrationId];

  if (!icon) {
    // Fallback: show first two letters
    return (
      <div className="h-9 w-9 rounded-lg bg-muted/80 flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
        {integrationName.slice(0, 2)}
      </div>
    );
  }

  const IconComponent = isThemeAwareIcon(icon)
    ? resolvedTheme === "dark"
      ? icon.dark
      : icon.light
    : icon;

  return (
    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 p-1.5">
      <IconComponent className={className} />
    </div>
  );
}
