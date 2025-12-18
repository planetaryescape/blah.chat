"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  Share2,
  Users,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
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
import { api } from "../../../../convex/_generated/api";

export default function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState<"conversation" | "note" | null>(
    null,
  );
  const [isForking, setIsForking] = useState<"private" | "collab" | null>(null);
  const [forkError, setForkError] = useState("");

  // Get current user to check ownership
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const currentUser = useQuery(api.users.getCurrentUser);

  // Try conversation share first
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversationShare = useQuery(api.shares.get, { shareId });

  // Try note share if conversation doesn't exist
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
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
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const verifyConversationShare = useAction(api.shares.verify);
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const verifyNoteShare = useAction(api.notes.verifyShare);

  // Fork actions
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const forkPrivate = useAction(api.shares.forkPrivate);
  // @ts-ignore - Type depth exceeded with complex Convex action (85+ modules)
  const forkCollaborative = useAction(api.shares.forkCollaborative);

  // Use the appropriate share
  const share = entityType === "note" ? noteShare : conversationShare;

  // Check if current user is the owner
  const isOwner =
    currentUser &&
    share &&
    "userId" in share &&
    share.userId === currentUser._id;

  // Use public queries for shared content (no auth required)
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const conversation = useQuery(
    api.shares.getSharedConversation,
    verified && entityType === "conversation" ? { shareId } : "skip",
  );
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const messages = useQuery(
    api.shares.getSharedMessages,
    verified && entityType === "conversation" ? { shareId } : "skip",
  );

  // Auto-verify shares that don't require password
  useEffect(() => {
    // Skip if already verified or password required
    if (verified || share?.requiresPassword) return;
    // Skip if entity type not determined yet
    if (!entityType) return;

    const autoVerify = async () => {
      try {
        if (entityType === "note" && noteShare?._id) {
          await verifyNoteShare({ noteId: noteShare._id });
        } else if (entityType === "conversation") {
          await verifyConversationShare({ shareId });
        }
        setVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    };

    autoVerify();
  }, [
    entityType,
    verified,
    share?.requiresPassword,
    noteShare?._id,
    shareId,
    verifyNoteShare,
    verifyConversationShare,
  ]);

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

  // Fork handlers
  const handleForkPrivate = async () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/share/${shareId}`);
      return;
    }
    setIsForking("private");
    setForkError("");
    try {
      const newId = await forkPrivate({ shareId });
      router.push(`/chat/${newId}`);
    } catch (err) {
      setForkError(err instanceof Error ? err.message : "Failed to fork");
      setIsForking(null);
    }
  };

  const handleForkCollaborative = async () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/share/${shareId}`);
      return;
    }
    setIsForking("collab");
    setForkError("");
    try {
      const collabId = await forkCollaborative({ shareId });
      router.push(`/chat/${collabId}`);
    } catch (err) {
      setForkError(
        err instanceof Error
          ? err.message
          : "Failed to create collaborative conversation",
      );
      setIsForking(null);
    }
  };

  // LOADING STATE: Wait for conversation share query to resolve
  if (conversationShare === undefined) {
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

  // LOADING STATE: Conversation not found, wait for note share query
  if (conversationShare === null && noteShare === undefined) {
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

  // NOT FOUND: Both queries resolved to null - share doesn't exist
  if (conversationShare === null && noteShare === null) {
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

  if (share && "revoked" in share && share.revoked) {
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

  if (!verified && share?.requiresPassword) {
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
    // Wait for entity type to be determined before auto-verifying
    if (!entityType) {
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

    // useEffect handles auto-verification, just show loading
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Verifying access...
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
            {/* Owner: show "Open Conversation" button */}
            {authLoaded &&
              entityType === "conversation" &&
              isOwner &&
              share &&
              "conversationId" in share && (
                <Button asChild variant="default" size="sm">
                  <Link href={`/chat/${share.conversationId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Conversation
                  </Link>
                </Button>
              )}
            {/* Non-owner signed-in: show fork buttons */}
            {authLoaded &&
              isSignedIn &&
              entityType === "conversation" &&
              !isOwner && (
                <>
                  <Button
                    onClick={handleForkPrivate}
                    disabled={!!isForking}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                  >
                    {isForking === "private" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Continue Privately
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleForkCollaborative}
                    disabled={!!isForking}
                    variant="default"
                    size="sm"
                  >
                    {isForking === "collab" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">
                          Continue with Creator
                        </span>
                        <span className="sm:hidden">Join</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            <ThemeToggle />
            {!isSignedIn && authLoaded && (
              <Button
                asChild
                variant="default"
                size="sm"
                className="font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <Link href="/sign-up">Start chatting</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Fork error toast */}
      {forkError && (
        <div className="fixed top-20 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-right">
          {forkError}
          <button
            onClick={() => setForkError("")}
            className="ml-2 hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

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
            {isSignedIn
              ? "Continue this conversation privately or collaborate with the creator."
              : "Sign in to continue this conversation or try blah.chat for free."}
          </p>
        </motion.div>

        {/* Messages */}
        <div className="space-y-6 pb-20">
          {messages.map((message: any, _index: number) => (
            <ChatMessage key={message._id} message={message} readOnly={true} />
          ))}

          {/* Try blah.chat CTA - only show to unauthenticated users */}
          {!isSignedIn && authLoaded && (
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
                      Pick up where they left off
                    </h3>
                    <p className="text-muted-foreground">
                      All models. Your data. Conversations that survive
                      anything.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="flex-shrink-0 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                  >
                    <Link href="/sign-up">Try it free</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
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
            • Total control. One interface.
          </p>
        </div>
      </footer>
    </div>
  );
}
