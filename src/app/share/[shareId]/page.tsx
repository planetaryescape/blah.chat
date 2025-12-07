"use client";

import { Logo } from "@/components/brand/Logo";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { NoteShareView } from "@/components/notes/NoteShareView";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Lock, Share2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export default function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState<"conversation" | "note" | null>(
    null,
  );

  // Try conversation share first
  // @ts-ignore - Convex type instantiation depth issue
  const conversationShare = useQuery(api.shares.get, { shareId });

  // Try note share if conversation doesn't exist
  // @ts-ignore - Convex type instantiation depth issue
  const noteShare = useQuery(
    api.notes.getByShareId,
    conversationShare === null ? { shareId } : "skip",
  );

  // Determine entity type
  useEffect(() => {
    if (conversationShare !== undefined && conversationShare !== null) {
      setEntityType("conversation");
    } else if (noteShare !== undefined && noteShare !== null) {
      setEntityType("note");
    }
  }, [conversationShare, noteShare]);

  // Separate verify actions
  // @ts-ignore - Convex type instantiation depth issue
  const verifyConversationShare = useAction(api.shares.verify);
  // @ts-ignore - Convex type instantiation depth issue
  const verifyNoteShare = useAction(api.notes.verifyShare);

  // Use the appropriate share
  const share = entityType === "note" ? noteShare : conversationShare;
  // @ts-ignore - Convex type instantiation depth issue
  const conversation = useQuery(
    api.conversations.get,
    verified && share && "conversationId" in share && share.conversationId
      ? { conversationId: share.conversationId }
      : "skip",
  );
  // @ts-ignore - Convex type instantiation depth issue
  const messages = useQuery(
    api.messages.list,
    verified && share && "conversationId" in share && share.conversationId
      ? { conversationId: share.conversationId }
      : "skip",
  );

  const handleVerify = async () => {
    try {
      if (entityType === "note" && noteShare?._id) {
        await verifyNoteShare({
          noteId: noteShare._id,
          password: password || undefined,
        });
      } else {
        await verifyConversationShare({
          shareId,
          password: password || undefined,
        });
      }
      setVerified(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  if (!share) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-screen bg-background relative">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-destructive/20 via-orange-500/10 to-destructive/20 rounded-[2rem] blur-3xl opacity-30 animate-pulse" />

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl">
            {/* Glass Highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="relative p-8 flex flex-col items-center text-center space-y-8">
              {/* Branding */}
              <div className="scale-125">
                <Logo size="lg" />
              </div>

              <div className="space-y-6 w-full">
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-destructive/10 to-black border border-destructive/20 flex items-center justify-center shadow-inner mx-auto">
                    <AlertCircle className="h-10 w-10 text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold tracking-tight text-white">
                    Share Not Found
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    This shared conversation doesn't exist or has expired.
                  </p>
                </div>
              </div>

              <div className="w-full pt-2 space-y-4">
                <Link href="/" className="w-full block">
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-white text-black hover:bg-white/90 font-medium transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
                  >
                    Return to Home
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                  <span>Powered by</span>
                  <span className="font-semibold text-white/80">blah.chat</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if ("revoked" in share && share.revoked) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-screen bg-background relative">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-destructive/20 via-orange-500/10 to-destructive/20 rounded-[2rem] blur-3xl opacity-30 animate-pulse" />

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl">
            {/* Glass Highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="relative p-8 flex flex-col items-center text-center space-y-8">
              {/* Branding */}
              <div className="scale-125">
                <Logo size="lg" />
              </div>

              <div className="space-y-6 w-full">
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-destructive/10 to-black border border-destructive/20 flex items-center justify-center shadow-inner mx-auto">
                    <AlertCircle className="h-10 w-10 text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold tracking-tight text-white">
                    Access Revoked
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    This conversation is no longer shared publicly. The owner
                    has disabled access to this link.
                  </p>
                </div>
              </div>

              <div className="w-full pt-2 space-y-4">
                <Link href="/" className="w-full block">
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-white text-black hover:bg-white/90 font-medium transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
                  >
                    Return to Home
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                  <span>Powered by</span>
                  <span className="font-semibold text-white/80">blah.chat</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!verified && share.requiresPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md surface-glass">
          <CardHeader className="text-center space-y-2 pb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Password Required</CardTitle>
            <CardDescription>
              This conversation is protected by a password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify();
                }}
                className="bg-background/50"
              />
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
            </div>
            <Button onClick={handleVerify} className="w-full">
              Unlock Conversation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verified) {
    // No password required, auto-verify
    if (entityType === "note" && noteShare?._id) {
      verifyNoteShare({ noteId: noteShare._id }).then(() => setVerified(true));
    } else {
      verifyConversationShare({ shareId }).then(() => setVerified(true));
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Accessing shared content...
          </p>
        </div>
      </div>
    );
  }

  // Render note share view if it's a note
  if (entityType === "note" && verified && noteShare?._id) {
    return <NoteShareView noteId={noteShare._id} />;
  }

  if (!conversation || !messages) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Loading conversation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Header */}
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
              {conversation.title}
            </h1>
          </div>
          <div className="flex-shrink-0 ml-4 flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="default"
              size="sm"
              className="font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <Link href="/">Try blah.chat</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Conversation Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 pb-8 border-b border-border/40"
        >
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/5 text-primary">
            <Share2 className="h-4 w-4 mr-2" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Shared Conversation
            </span>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            This is a read-only view of a conversation shared from blah.chat.
          </p>
        </motion.div>

        {/* Messages */}
        <div className="space-y-6 pb-20">
          {messages.map((message: any, index: number) => (
            <ChatMessage key={message._id} message={message} readOnly={true} />
          ))}

          {/* Try blah.chat CTA */}
          <motion.div
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
                    Experience the future of chat
                  </h3>
                  <p className="text-muted-foreground">
                    Create your own personal AI assistant with multi-model
                    support, RAG memory, and full data ownership.
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="flex-shrink-0 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                >
                  <Link href="/">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
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
            • AI-powered conversations
          </p>
        </div>
      </footer>
    </div>
  );
}
