import { AlertTriangle, CheckCircle2, Info, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "About AI Responses | blah.chat",
  description:
    "Learn about AI limitations and how to use AI responses responsibly.",
};

export default function AIInfoPage() {
  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">
              About AI Responses
            </h1>
            <p className="text-sm text-muted-foreground">
              Understanding AI capabilities and limitations
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
          {/* AI Makes Mistakes */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold">AI Can Make Mistakes</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              blah.chat provides access to various AI models from different
              providers. While these models are powerful, they may occasionally:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Generate inaccurate or outdated information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Misunderstand context or nuance in your questions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Produce plausible-sounding but incorrect responses
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Have knowledge cutoff dates and miss recent events
              </li>
            </ul>
          </section>

          {/* Your Responsibility */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">Your Responsibility</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Always verify important information from AI responses, especially
              for:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Medical, legal, or financial advice — consult qualified
                professionals
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Critical decisions that could impact your life or business
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Factual claims, statistics, or citations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-1.5">•</span>
                Code or technical solutions in production environments
              </li>
            </ul>
          </section>

          {/* Different Models */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Info className="h-5 w-5 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold">
                Different Models, Different Capabilities
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              blah.chat gives you access to models from OpenAI, Anthropic,
              Google, and others. Each model has unique strengths and
              limitations. Some excel at coding, others at creative writing, and
              some are optimized for speed over depth. Results may vary between
              models for the same question.
            </p>
          </section>

          {/* Legal */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Scale className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Legal Information</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              AI responses are provided "as is" without warranty of accuracy or
              completeness. By using blah.chat, you accept responsibility for
              how you use AI-generated content. For complete details, please
              review our{" "}
              <Link
                href="/terms"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* Tips for Best Results */}
          <section className="space-y-4 pb-8">
            <h2 className="text-lg font-semibold">Tips for Best Results</h2>
            <div className="grid gap-3">
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <p className="text-sm font-medium mb-1">Be specific</p>
                <p className="text-sm text-muted-foreground">
                  Clear, detailed questions get better answers
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <p className="text-sm font-medium mb-1">
                  Cross-reference important info
                </p>
                <p className="text-sm text-muted-foreground">
                  Verify critical facts with authoritative sources
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <p className="text-sm font-medium mb-1">Try different models</p>
                <p className="text-sm text-muted-foreground">
                  If one model struggles, another might excel
                </p>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
