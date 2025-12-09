import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ConvexClerkProvider } from "@/components/providers/convex-clerk-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/styles/math.css";
import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Syne } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL =
  process.env.NODE_ENV === "production"
    ? "https://blah.chat"
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "blah.chat",
    template: "%s | blah.chat",
  },
  description:
    "Personal AI chat assistant with access to all models (OpenAI, Gemini, Claude), mid-chat switching, conversation branching, and transparent cost tracking.",
  applicationName: "blah.chat",

  keywords: [
    "AI chat",
    "Multi-model AI",
    "Conversation Branching",
    "Hybrid Search",
    "Model Switching",
    "OpenAI",
    "Claude",
    "Gemini",
    "Perplexity",
    "Cost Tracking",
  ],

  authors: [{ name: "Planetary Escape (Pvt) Ltd" }],
  creator: "Planetary Escape (Pvt) Ltd",
  publisher: "Planetary Escape (Pvt) Ltd",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },

  manifest: "/manifest.json",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "blah.chat",
    title: "blah.chat",
    description:
      "All models in one app. Switch mid-chat, branch conversations, and track costs transparently.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "blah.chat - Personal AI chat assistant",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "blah.chat",
    description: "All models. Mid-chat switching. Total control.",
    images: ["/opengraph-image"],
  },

  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#191024" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD structured data for SEO (Schema.org)
  // SECURITY: Safe to use dangerouslySetInnerHTML here - all content is static,
  // hardcoded strings with no user input or dynamic data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "blah.chat",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Personal AI chat assistant with multi-model support, RAG memory, and cost tracking",
    featureList: [
      "Universal Model Access (OpenAI, Google, Anthropic, Perplexity)",
      "Mid-chat Model Switching",
      "Conversation Branching",
      "Hybrid Search & Projects",
      "Transparent Cost Tracking",
      "Running on cloud infrastructure",
      "Voice input and file uploads",
    ],
    author: {
      "@type": "Organization",
      name: "Planetary Escape (Pvt) Ltd",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Static SEO data only, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${syne.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ConvexClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <AnalyticsProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
                <Toaster />
              </AnalyticsProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
