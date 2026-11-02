"use client";

import { motion } from "framer-motion";
import { FileText, PenLine, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variant?: "no-notes" | "no-selection" | "no-results";
  onCreateNote?: () => void;
}

export function EmptyState({
  variant = "no-selection",
  onCreateNote,
}: EmptyStateProps) {
  if (variant === "no-notes") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex h-full items-center justify-center p-8"
      >
        <div className="max-w-md text-center space-y-6">
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-subtle" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">
              Start Your Collection
            </h3>
            <p className="text-muted-foreground text-balance">
              Capture ideas, save important snippets, or start writing your next
              masterpiece.
            </p>
          </div>

          {onCreateNote && (
            <Button
              onClick={onCreateNote}
              size="lg"
              className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
            >
              <PenLine className="mr-2 h-4 w-4" />
              Create First Note
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === "no-results") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex h-full items-center justify-center p-8"
      >
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-muted/50">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">No notes found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // no-selection (default)
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-muted/5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md space-y-8"
      >
        <div className="relative mx-auto">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/10 to-accent/10 blur-xl opacity-50" />
          <div className="relative h-24 w-24 mx-auto bg-background rounded-3xl shadow-xl flex items-center justify-center border border-border/50 rotate-3 transition-transform hover:rotate-6 duration-500">
            <FileText className="h-10 w-10 text-primary/80" />
          </div>
          <div className="absolute -right-2 -bottom-2 h-12 w-12 bg-background rounded-2xl shadow-lg flex items-center justify-center border border-border/50 -rotate-6 transition-transform hover:-rotate-12 duration-500">
            <PenLine className="h-5 w-5 text-accent" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Select a note to view
          </h2>
          <p className="text-muted-foreground text-lg text-balance leading-relaxed">
            Choose a note from the sidebar to start editing, or create a new one
            to capture your thoughts.
          </p>
        </div>

        <div className="pt-4">
          {onCreateNote ? (
            <Button
              onClick={onCreateNote}
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
            >
              <PenLine className="mr-2 h-4 w-4" />
              Create New Note
            </Button>
          ) : (
            <div className="h-8" />
          )}
        </div>
      </motion.div>
    </div>
  );
}
