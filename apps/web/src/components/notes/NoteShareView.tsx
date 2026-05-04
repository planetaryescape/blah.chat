"use client";

import DOMPurify from "dompurify";
import { m } from "framer-motion";
import katex from "katex";
import { ExternalLink, FileText } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import "katex/dist/katex.min.css";

interface NoteShareViewProps {
  note: {
    _id: string;
    title: string;
    content: string;
  };
  isOwner?: boolean;
}

export function NoteShareView({ note, isOwner = false }: NoteShareViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(note.content) as string);
  }, [note.content]);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const mathNodes = contentRef.current.querySelectorAll(
      '[data-type="mathematics"]',
    );

    mathNodes.forEach((node) => {
      const latex = node.getAttribute("data-latex");
      if (!latex) {
        return;
      }

      try {
        katex.render(latex, node as HTMLElement, {
          throwOnError: false,
          errorColor: "hsl(var(--destructive))",
          output: "mathml",
          strict: "warn",
        });
      } catch (error) {
        console.error("KaTeX render error:", error);
        node.textContent = latex;
      }
    });
  }, [sanitizedHtml]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Logo size="md" />
            </Link>
            <div className="h-6 w-px bg-border/50 hidden md:block flex-shrink-0" />
            <h1 className="text-sm md:text-base font-semibold truncate min-w-0">
              {note.title}
            </h1>
          </div>
          <div className="flex-shrink-0 ml-4 flex items-center gap-2">
            <ThemeToggle />
            {isOwner ? (
              <Button
                asChild
                variant="default"
                size="sm"
                className="font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <Link href={`/notes?id=${note._id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Note
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="default"
                size="sm"
                className="font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <Link href="/">Start chatting</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 pb-8 border-b border-border/40"
        >
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/5 text-primary">
            <FileText className="h-4 w-4 mr-2" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Shared Note
            </span>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            This is a read-only view of a note shared from blah.chat.
          </p>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="pb-20"
        >
          <article
            ref={contentRef}
            className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />

          {!isOwner && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-12 pt-8 border-t border-border/40"
            >
              <Card className="surface-glass border-primary/20 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8 relative z-10">
                  <div className="flex-shrink-0 p-4 rounded-2xl bg-background/50 border border-white/10 shadow-xl">
                    <Logo size="lg" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <h3 className="text-2xl font-display font-bold">
                      Write your own notes with AI
                    </h3>
                    <p className="text-muted-foreground">
                      All models. Your data. Notes that never get lost.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="flex-shrink-0 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                  >
                    <Link href="/">Try it free</Link>
                  </Button>
                </CardContent>
              </Card>
            </m.div>
          )}
        </m.div>
      </main>

      <footer className="border-t border-border/40 py-8 bg-muted/20">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <Link
              href="/"
              className="font-medium text-foreground hover:underline"
            >
              blah.chat
            </Link>{" "}
            • Total control. One interface.
          </p>
        </div>
      </footer>
    </div>
  );
}
