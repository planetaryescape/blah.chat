import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ConvexClerkProvider } from "@/components/providers/convex-clerk-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/styles/math.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
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
    default: "blah.chat - Total Control. One Interface.",
    template: "%s | blah.chat",
  },
  description:
    "The bespoke AI interface. Access OpenAI, Anthropic, Gemini, and Perplexity in one premium workspace. Fracture-less conversation branching.",
  applicationName: "blah.chat",

  keywords: [
    "AI chat",
    "Bespoke AI",
    "Multi-model AI",
    "Conversation Branching",
    "Hybrid Search",
    "Privacy-first",
    "Minimalist interface",
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
    title: "blah.chat - Total Control.",
    description:
      "Total Control. One Interface. Access all models, switch mid-chat, and branch conversations in a bespoke, premium workspace.",
    // Next.js automatically detects opengraph-image.png in the route
    // naming scheme, but explicit definition is safe.
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "blah.chat - Total Control. One Interface.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "blah.chat",
    description: "Total Control. One Interface. All models in one place.",
    images: ["/opengraph-image.png"],
  },

  category: "technology",
};
// Viewport configuration moved to src/app/viewport.ts

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
        {/* Preconnect to Clerk for faster auth - improves LCP */}
        <link rel="preconnect" href="https://clerk.accounts.dev" />
        <link rel="dns-prefetch" href="https://clerk.accounts.dev" />
        {/* Preconnect to Convex for faster data */}
        <link rel="preconnect" href="https://convex.cloud" />
        <link rel="dns-prefetch" href="https://convex.cloud" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${syne.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ConvexClerkProvider>
          <QueryProvider>
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
          </QueryProvider>
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
