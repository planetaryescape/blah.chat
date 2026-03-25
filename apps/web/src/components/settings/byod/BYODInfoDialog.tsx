"use client";

import { CheckCircle, Database, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface BYODInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BYODInfoDialog({ open, onOpenChange }: BYODInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            About Bring Your Own Database
          </DialogTitle>
          <DialogDescription>
            Complete data ownership with your own Neon Postgres instance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="font-semibold">What is BYOD?</h3>
              <p className="text-sm text-muted-foreground">
                BYOD (Bring Your Own Database) lets you store your personal data
                on your own Neon Postgres instance instead of blah.chat&apos;s
                servers. Your conversations, messages, notes, and files are
                stored in a database you control.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Why use BYOD?</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Data ownership</strong> — Your data lives in your
                    Postgres database
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Privacy</strong> — Only you have access to your
                    conversations
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Portability</strong> — Standard Postgres, export
                    anytime with pg_dump
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Direct access</strong> — Query your data with any
                    SQL client
                  </span>
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">How it works</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>blah.chat uses a two-database architecture:</p>
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div>
                    <span className="font-medium text-foreground">
                      Main database (blah.chat)
                    </span>
                    <p className="text-xs">
                      User accounts, settings, preferences, usage tracking
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Your database (Neon)
                    </span>
                    <p className="text-xs">
                      Conversations, messages, notes, files, projects, bookmarks
                    </p>
                  </div>
                </div>
                <p>
                  Schema migrations are applied automatically to your Neon
                  instance when updates are released.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">What you need</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  <strong>Neon account</strong> — Free tier works fine
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    asChild
                  >
                    <a
                      href="https://neon.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      neon.tech{" "}
                      <ExternalLink className="h-3 w-3 ml-0.5 inline" />
                    </a>
                  </Button>
                </li>
                <li>
                  <strong>New Neon project</strong> — Create one for blah.chat
                </li>
                <li>
                  <strong>Connection string</strong> — Copy from Neon Console →
                  Connection Details
                </li>
              </ol>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Setup steps</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Create a new project at console.neon.tech</li>
                <li>Copy the connection string from the dashboard</li>
                <li>Paste it in the form and click Connect</li>
                <li>
                  Migrations run automatically — your database is ready in
                  seconds
                </li>
              </ol>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">
                Your connection string is encrypted with AES-256-GCM before
                storage and never logged. Decryption only happens server-side
                when needed for database operations.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Current limitations</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Only Neon Postgres is supported in v1</li>
                <li>File storage stays on blah.chat</li>
                <li>
                  You must maintain an active connection for the app to work
                </li>
                <li>New setup starts fresh (no data migration from main DB)</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
