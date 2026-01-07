import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service | blah.chat",
  description: "Terms of service for blah.chat",
};

export default function TermsPage() {
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
          <h1 className="font-syne font-bold text-lg">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-muted-foreground text-sm mb-8">
            <strong>Effective Date</strong>: December 17, 2025 |{" "}
            <strong>Last Updated</strong>: December 17, 2025
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using blah.chat ("the Service"), you agree to be
            bound by these Terms of Service. If you don't agree, don't use the
            Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            blah.chat is a multi-model AI chat interface that provides access to
            various AI models (GPT, Claude, Gemini, Llama, etc.) through a
            unified interface. The Service includes:
          </p>
          <ul>
            <li>
              <strong>Cloud</strong>: Fully managed service
            </li>
            <li>
              <strong>BYOK</strong>: Bring your own API keys
            </li>
            <li>
              <strong>BYOD</strong>: Bring your own database (coming soon)
            </li>
            <li>
              <strong>Self-hosted</strong>: Run on your own infrastructure
            </li>
          </ul>

          <h2>3. Account Registration</h2>
          <ul>
            <li>
              You must provide accurate information when creating an account
            </li>
            <li>You are responsible for maintaining account security</li>
            <li>You must be 13+ years old (16+ in EU) to use the Service</li>
            <li>One account per person unless explicitly authorized</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use the Service for illegal activities</li>
            <li>Generate harmful, abusive, or hateful content</li>
            <li>Attempt to bypass usage limits or security measures</li>
            <li>
              Reverse engineer the Service (except as permitted by AGPLv3)
            </li>
            <li>Resell access without authorization</li>
            <li>Use the Service to harm others or spread misinformation</li>
          </ul>

          <h2>5. AI-Generated Content</h2>
          <ul>
            <li>AI responses may contain errors or inaccuracies</li>
            <li>You are responsible for verifying AI-generated content</li>
            <li>Don't rely on AI for medical, legal, or financial advice</li>
            <li>
              You retain ownership of your inputs; outputs are subject to AI
              provider terms
            </li>
          </ul>

          <h2>6. Pricing & Payments</h2>
          <ul>
            <li>
              <strong>Cloud</strong>: Usage-based pricing, billed monthly
            </li>
            <li>
              <strong>BYOK</strong>: You pay AI providers directly for inference
            </li>
            <li>
              <strong>Self-hosted</strong>: Free (AGPLv3), you cover
              infrastructure costs
            </li>
          </ul>
          <p>
            Prices may change with 30 days notice. Refunds handled case-by-case.
          </p>

          <h2>7. Data & Privacy</h2>
          <p>
            Your use of data is governed by our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . Key points:
          </p>
          <ul>
            <li>We don't sell your data</li>
            <li>You can export or delete your data anytime</li>
            <li>BYOD mode keeps your data in your own database</li>
          </ul>

          <h2>8. Intellectual Property</h2>
          <ul>
            <li>
              blah.chat software is licensed under{" "}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                target="_blank"
                rel="noopener"
              >
                AGPLv3
              </a>
            </li>
            <li>You retain rights to your content</li>
            <li>"blah.chat" name and logo are trademarks of Bhekani Khumalo</li>
          </ul>

          <h2>9. Service Availability</h2>
          <ul>
            <li>We aim for 99.9% uptime but don't guarantee it</li>
            <li>Scheduled maintenance will be announced in advance</li>
            <li>AI provider outages may affect service availability</li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO
            THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
          </p>

          <h2>11. Termination</h2>
          <ul>
            <li>You can delete your account anytime</li>
            <li>We may suspend accounts that violate these terms</li>
            <li>
              Upon termination, your data will be deleted per our Privacy Policy
            </li>
          </ul>

          <h2>12. Changes to Terms</h2>
          <p>
            We may update these terms. Material changes will be notified via
            email or in-app notice 30 days in advance. Continued use after
            changes constitutes acceptance.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These terms are governed by the laws of South Africa. Disputes will
            be resolved through arbitration.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these terms? Email us at{" "}
            <a href="mailto:blah.chat@bhekani.com">blah.chat@bhekani.com</a>
          </p>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            For self-hosted instances, the software is provided under the{" "}
            <a
              href="https://github.com/planetaryescape/blah.chat/blob/main/LICENSE"
              target="_blank"
              rel="noopener"
            >
              AGPLv3 license
            </a>{" "}
            with additional terms regarding usage limits.
          </p>
        </div>
      </main>
    </div>
  );
}
