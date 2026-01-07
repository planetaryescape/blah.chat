import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy | blah.chat",
  description: "Privacy policy for blah.chat - how we handle your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="font-syne font-bold text-lg">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-8">
            <strong>Effective Date</strong>: December 17, 2025 |{" "}
            <strong>Last Updated</strong>: December 17, 2025
          </p>

          <div className="bg-card/50 border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold mt-0 mb-4">Summary</h2>
            <ul className="space-y-2 text-sm list-none pl-0 mb-0">
              <li>
                <strong>Cloud version</strong>: We store your data securely. You
                can export or delete anytime.
              </li>
              <li>
                <strong>BYOK</strong>: Your API keys go directly to providers.
                We never store them.
              </li>
              <li>
                <strong>BYOD</strong>: Your data stays in your Convex database.
                We only store operational data.
              </li>
              <li>
                <strong>Self-hosted</strong>: You control everything. Nothing
                leaves your infrastructure.
              </li>
            </ul>
          </div>

          <h2>What Data We Collect</h2>

          <h3>Account Information</h3>
          <ul>
            <li>Email address (for authentication)</li>
            <li>Name (optional, for personalization)</li>
            <li>OAuth connections (Google, GitHub if you use them)</li>
          </ul>

          <h3>Usage Data</h3>
          <ul>
            <li>Conversations and messages (encrypted at rest)</li>
            <li>Notes, tasks, and projects you create</li>
            <li>Memory extractions (facts from conversations)</li>
            <li>Token usage and costs (for billing and transparency)</li>
          </ul>

          <h3>What We Don't Collect</h3>
          <ul>
            <li>Your API keys (BYOK mode - sent directly to providers)</li>
            <li>Browsing history or tracking cookies</li>
            <li>Data from your personal Convex database (BYOD mode)</li>
          </ul>

          <h2>How We Use Your Data</h2>
          <ul>
            <li>
              <strong>Provide the service</strong>: Store and sync your
              conversations
            </li>
            <li>
              <strong>Memory features</strong>: Extract and recall facts you've
              shared
            </li>
            <li>
              <strong>Cost tracking</strong>: Show you exactly what you're
              spending
            </li>
            <li>
              <strong>Improve the product</strong>: Aggregate, anonymous usage
              metrics
            </li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>We use these services to operate blah.chat:</p>
          <ul>
            <li>
              <strong>Convex</strong>: Database and backend (
              <a
                href="https://convex.dev/privacy"
                target="_blank"
                rel="noopener"
              >
                privacy policy
              </a>
              )
            </li>
            <li>
              <strong>Clerk</strong>: Authentication (
              <a
                href="https://clerk.com/privacy"
                target="_blank"
                rel="noopener"
              >
                privacy policy
              </a>
              )
            </li>
            <li>
              <strong>Vercel</strong>: Hosting and AI Gateway (
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener"
              >
                privacy policy
              </a>
              )
            </li>
            <li>
              <strong>AI Providers</strong>: OpenAI, Anthropic, Google, etc.
              (each has their own privacy policy)
            </li>
          </ul>

          <h2>Your Rights</h2>
          <ul>
            <li>
              <strong>Export</strong>: Download all your data anytime
            </li>
            <li>
              <strong>Delete</strong>: Remove your account and all associated
              data
            </li>
            <li>
              <strong>Access</strong>: See exactly what data we have about you
            </li>
            <li>
              <strong>Portability</strong>: Get your data in machine-readable
              format
            </li>
          </ul>

          <h2>Data Retention</h2>
          <ul>
            <li>
              <strong>Active accounts</strong>: Data kept as long as your
              account is active
            </li>
            <li>
              <strong>Deleted accounts</strong>: Data permanently deleted within
              30 days
            </li>
            <li>
              <strong>Memories</strong>: Expire after 90 days by default
              (configurable)
            </li>
          </ul>

          <h2>Security</h2>
          <ul>
            <li>All data encrypted in transit (TLS 1.3)</li>
            <li>All data encrypted at rest (AES-256)</li>
            <li>SOC 2 compliant infrastructure (Convex, Clerk, Vercel)</li>
            <li>No plaintext storage of sensitive data</li>
          </ul>

          <h2>GDPR Compliance</h2>
          <p>
            If you're in the EU, you have additional rights under GDPR. We
            comply with all requirements including data portability, right to
            erasure, and data processing agreements with our subprocessors.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about privacy? Email us at{" "}
            <a href="mailto:blah.chat@bhekani.com">blah.chat@bhekani.com</a>
          </p>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            For self-hosted instances, see the full{" "}
            <a
              href="https://github.com/planetaryescape/blah.chat/blob/main/PRIVACY.md"
              target="_blank"
              rel="noopener"
            >
              self-hosted privacy policy
            </a>{" "}
            on GitHub.
          </p>
        </div>
      </main>
    </div>
  );
}
