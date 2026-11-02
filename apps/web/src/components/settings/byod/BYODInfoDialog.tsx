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
            Complete data ownership with your own Convex instance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* What is BYOD */}
            <section className="space-y-2">
              <h3 className="font-semibold">What is BYOD?</h3>
              <p className="text-sm text-muted-foreground">
                BYOD (Bring Your Own Database) lets you store your personal data
                on your own Convex instance instead of blah.chat&apos;s servers.
                Your conversations, messages, memories, files, and projects are
                stored in a database you control.
              </p>
            </section>

            {/* Why use BYOD */}
            <section className="space-y-2">
              <h3 className="font-semibold">Why use BYOD?</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Data ownership</strong> — Your data lives in your
                    database, export anytime
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Privacy</strong> — Only you have access to your
                    stored conversations
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Portability</strong> — If blah.chat shuts down, your
                    data persists
                  </span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Direct access</strong> — Query your data directly
                    via Convex dashboard
                  </span>
                </li>
              </ul>
            </section>

            {/* How it works */}
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
                      User accounts, settings, preferences, templates, admin
                      data
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Your database (BYOD)
                    </span>
                    <p className="text-xs">
                      Conversations, messages, memories, files, projects, notes,
                      tasks
                    </p>
                  </div>
                </div>
                <p>
                  When you send a message, it flows through blah.chat for AI
                  processing, then gets stored on your Convex instance.
                  blah.chat never persists your conversation content on its
                  servers.
                </p>
              </div>
            </section>

            {/* What you need */}
            <section className="space-y-2">
              <h3 className="font-semibold">What you need</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  <strong>Convex account</strong> — Free tier works fine
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    asChild
                  >
                    <a
                      href="https://convex.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      convex.dev{" "}
                      <ExternalLink className="h-3 w-3 ml-0.5 inline" />
                    </a>
                  </Button>
                </li>
                <li>
                  <strong>New Convex project</strong> — Create one specifically
                  for blah.chat
                </li>
                <li>
                  <strong>Deploy key</strong> — Found in Convex Dashboard →
                  Settings → Deploy Key
                </li>
              </ol>
            </section>

            {/* Setup steps */}
            <section className="space-y-2">
              <h3 className="font-semibold">Setup steps</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Create a new project at dashboard.convex.dev</li>
                <li>Go to Settings → Deploy Key and copy it</li>
                <li>
                  Copy your deployment URL (e.g.,
                  https://your-project.convex.cloud)
                </li>
                <li>
                  Enter both in the form and click &quot;Save & Continue&quot;
                </li>
                <li>Download the schema package (ZIP file)</li>
                <li>
                  Unzip and run{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    bunx convex deploy
                  </code>{" "}
                  in the folder
                </li>
                <li>Click &quot;Verify Deployment&quot; to confirm setup</li>
                <li>Done! Your data will now be stored on your instance</li>
              </ol>
            </section>

            {/* Cost implications */}
            <section className="space-y-2">
              <h3 className="font-semibold">Cost implications</h3>
              <div className="text-sm text-muted-foreground">
                <p>
                  With BYOD, <strong>you pay for your own Convex usage</strong>.
                  Convex offers a generous free tier that&apos;s sufficient for
                  most personal use:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>1M function calls/month</li>
                  <li>1GB database storage</li>
                  <li>1GB file storage</li>
                </ul>
                <p className="mt-2">
                  Check{" "}
                  <a
                    href="https://convex.dev/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Convex pricing
                  </a>{" "}
                  for details. Heavy usage may require their paid plan.
                </p>
              </div>
            </section>

            {/* What happens when disconnecting */}
            <section className="space-y-2">
              <h3 className="font-semibold">Disconnecting BYOD</h3>
              <p className="text-sm text-muted-foreground">
                When you disconnect, you choose what happens to your data:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Keep:</span>
                  <span>
                    Data stays on your instance, accessible via Convex dashboard
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Migrate:</span>
                  <span>Move data back to blah.chat servers (coming soon)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">Delete:</span>
                  <span>
                    Permanently remove from your instance (coming soon)
                  </span>
                </li>
              </ul>
            </section>

            {/* Connection issues */}
            <section className="space-y-2">
              <h3 className="font-semibold">Connection issues</h3>
              <p className="text-sm text-muted-foreground">
                If your database becomes unreachable, blah.chat will block the
                app to protect data integrity. You&apos;ll see a connection
                error screen with options to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mt-2 list-disc list-inside">
                <li>Retry the connection</li>
                <li>Update your credentials</li>
                <li>Check Convex status page</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                We run health checks every 6 hours to detect issues early.
              </p>
            </section>

            {/* Schema Updates */}
            <section className="space-y-2">
              <h3 className="font-semibold">Schema updates</h3>
              <p className="text-sm text-muted-foreground">
                When blah.chat releases schema updates, you&apos;ll see a
                notification banner. To update:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 mt-2 list-decimal list-inside">
                <li>Download the new schema package from Settings</li>
                <li>
                  Run{" "}
                  <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                    bunx convex deploy
                  </code>{" "}
                  again
                </li>
                <li>Click &quot;Verify&quot; to confirm the update</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-2">
                We&apos;ll also send you an email when updates are available.
              </p>
            </section>

            {/* Limitations */}
            <section className="space-y-2">
              <h3 className="font-semibold">Current limitations</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Schema updates require manual re-deployment (CLI command)
                </li>
                <li>
                  File storage currently stays on blah.chat (migration planned)
                </li>
                <li>
                  You must maintain an active connection for the app to work
                </li>
              </ul>
            </section>

            {/* Security */}
            <section className="space-y-2">
              <h3 className="font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">
                Your deploy key is encrypted with AES-256-GCM before storage and
                never logged. Only encrypted credentials are stored, and
                decryption happens server-side when needed for database
                operations.
              </p>
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
