"use client";

import { useTheme } from "next-themes";
import type { SVGProps } from "react";

// Import all available svgl icons
import { AsanaLogo } from "@/components/ui/svgs/asanaLogo";
import { Calendly } from "@/components/ui/svgs/calendly";
import { Discord } from "@/components/ui/svgs/discord";
import { Docker } from "@/components/ui/svgs/docker";
import { Dropbox } from "@/components/ui/svgs/dropbox";
import { GithubDark } from "@/components/ui/svgs/githubDark";
import { GithubLight } from "@/components/ui/svgs/githubLight";
import { Gitlab } from "@/components/ui/svgs/gitlab";
import { Gmail } from "@/components/ui/svgs/gmail";
import { Google } from "@/components/ui/svgs/google";
import { Linear } from "@/components/ui/svgs/linear";
import { Microsoft } from "@/components/ui/svgs/microsoft";
import { MongodbIconDark } from "@/components/ui/svgs/mongodbIconDark";
import { MongodbIconLight } from "@/components/ui/svgs/mongodbIconLight";
import { Netlify } from "@/components/ui/svgs/netlify";
import { Notion } from "@/components/ui/svgs/notion";
import { Paypal } from "@/components/ui/svgs/paypal";
import { Salesforce } from "@/components/ui/svgs/salesforce";
import { Sentry } from "@/components/ui/svgs/sentry";
import { Slack } from "@/components/ui/svgs/slack";
import { Stripe } from "@/components/ui/svgs/stripe";
import { Supabase } from "@/components/ui/svgs/supabase";
import { Telegram } from "@/components/ui/svgs/telegram";
import { Todoist } from "@/components/ui/svgs/todoist";
import { Twilio } from "@/components/ui/svgs/twilio";
import { Vercel } from "@/components/ui/svgs/vercel";
import { VercelDark } from "@/components/ui/svgs/vercelDark";
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon";

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.ReactNode;

interface ThemeAwareIcon {
  light: IconComponent;
  dark: IconComponent;
}

// Map integration IDs to svgl components
// Some have theme variants, others are universal
const ICON_MAP: Record<string, IconComponent | ThemeAwareIcon> = {
  // Development
  github: { light: GithubLight, dark: GithubDark },
  gitlab: Gitlab,
  linear: Linear,
  sentry: Sentry,
  vercel: { light: Vercel, dark: VercelDark },
  netlify: Netlify,
  docker: Docker,

  // Communication
  gmail: Gmail,
  slack: Slack,
  discord: Discord,
  telegram: Telegram,
  whatsapp_business: WhatsappIcon,

  // Productivity
  google_calendar: Google,
  calendly: Calendly,
  notion: Notion,
  asana: AsanaLogo,
  todoist: Todoist,
  google_docs: Google,

  // Data & Storage
  google_sheets: Google,
  google_drive: Google,
  dropbox: Dropbox,
  supabase: Supabase,
  mongodb: { light: MongodbIconLight, dark: MongodbIconDark },

  // CRM & Sales
  salesforce: Salesforce,

  // Finance & Payments
  stripe: Stripe,
  paypal: Paypal,

  // Automation
  twilio: Twilio,

  // Microsoft products (use Microsoft logo)
  outlook: Microsoft,
  teams: Microsoft,
  outlook_calendar: Microsoft,
  onedrive: Microsoft,
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
