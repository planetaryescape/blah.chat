# Phase 5: Share Page UI

**Duration**: 1-2 hours
**Dependencies**: Phase 3 (Fork Mutations)
**Next**: User testing

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why This Phase?

This phase adds the UI buttons that allow users to fork conversations. The fork mutations from Phase 3 do the heavy lifting - this phase just connects them to buttons.

---

## Current State

### Existing Share Page

**File**: `src/app/share/[shareId]/page.tsx`

Current behavior:
- Shows shared conversation/note content
- Read-only view
- No fork options

### From Previous Phases

- `api.shares.forkPrivate` mutation available (Phase 3)
- `api.shares.forkCollaborative` mutation available (Phase 3)
- Loading state fix already implemented (earlier in this session)

---

## Phase Goals

By the end of this phase:
1. ✅ "Continue Privately" button visible for signed-in users
2. ✅ "Continue with Creator" button visible for conversations
3. ✅ Sign-in redirect for unauthenticated users
4. ✅ Loading states during fork
5. ✅ Redirect to new conversation after fork

---

## Prerequisites

- [ ] Phase 3 complete (fork mutations working)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Add Imports

Open `src/app/share/[shareId]/page.tsx` and add imports:

```typescript
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Users, Loader2, GitFork } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
```

### Step 2: Add Hooks Inside Component

Inside the main component function, add:

```typescript
export default function SharePage({ params }: { params: { shareId: string } }) {
  const { shareId } = params;
  const router = useRouter();

  // Authentication state
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  // Fork mutations
  const forkPrivate = useMutation(api.shares.forkPrivate);
  const forkCollaborative = useMutation(api.shares.forkCollaborative);

  // Loading state for buttons
  const [isForking, setIsForking] = useState<"private" | "collab" | null>(null);
  const [forkError, setForkError] = useState<string | null>(null);

  // ... rest of component
}
```

### Step 3: Add Fork Handler Functions

Add these handler functions before the return statement:

```typescript
/**
 * Fork conversation privately (user's own copy)
 */
const handleForkPrivate = async () => {
  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push(`/sign-in?redirect_url=/share/${shareId}`);
    return;
  }

  setIsForking("private");
  setForkError(null);

  try {
    const newConversationId = await forkPrivate({ shareId });
    router.push(`/chat/${newConversationId}`);
  } catch (error) {
    console.error("Fork private failed:", error);
    setForkError(
      error instanceof Error ? error.message : "Failed to fork conversation"
    );
    setIsForking(null);
  }
};

/**
 * Fork conversation collaboratively (shared with creator)
 */
const handleForkCollaborative = async () => {
  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push(`/sign-in?redirect_url=/share/${shareId}`);
    return;
  }

  setIsForking("collab");
  setForkError(null);

  try {
    const collabConversationId = await forkCollaborative({ shareId });
    router.push(`/chat/${collabConversationId}`);
  } catch (error) {
    console.error("Fork collaborative failed:", error);
    setForkError(
      error instanceof Error ? error.message : "Failed to create collaboration"
    );
    setIsForking(null);
  }
};
```

### Step 4: Add Fork Buttons to Header

Find the header section of the page and add the buttons. Look for something like:

```tsx
<header className="...">
  <div className="...">
    {/* Existing header content */}
  </div>
</header>
```

Add the fork buttons in the header:

```tsx
<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
  <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-5xl mx-auto">
    {/* Left side: Logo and title */}
    <div className="flex items-center gap-4 min-w-0">
      <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
        <Logo size="md" />
      </Link>
      <div className="h-6 w-px bg-border/50 hidden md:block flex-shrink-0" />
      <h1 className="text-sm md:text-base font-semibold truncate min-w-0">
        {/* Share title */}
      </h1>
    </div>

    {/* Right side: Fork buttons + other actions */}
    <div className="flex-shrink-0 ml-4 flex items-center gap-2">
      {/* Fork buttons - only show for verified conversation shares */}
      {authLoaded && entityType === "conversation" && (
        <>
          {/* Show error if any */}
          {forkError && (
            <span className="text-xs text-destructive mr-2 hidden md:inline">
              {forkError}
            </span>
          )}

          {/* Continue Privately button */}
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
                <GitFork className="h-4 w-4 mr-2" />
                Continue Privately
              </>
            )}
          </Button>

          {/* Continue with Creator button */}
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
                <span className="hidden sm:inline">Continue with Creator</span>
                <span className="sm:hidden">Collaborate</span>
              </>
            )}
          </Button>
        </>
      )}

      {/* Note fork button (simpler, private only) */}
      {authLoaded && entityType === "note" && (
        <Button
          onClick={handleForkPrivate}
          disabled={!!isForking}
          variant="default"
          size="sm"
        >
          {isForking === "private" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save to My Notes"
          )}
        </Button>
      )}

      {/* Existing buttons: ThemeToggle, Try blah.chat, etc. */}
      <ThemeToggle />
      <Button asChild variant="ghost" size="sm">
        <Link href="/">Try blah.chat</Link>
      </Button>
    </div>
  </div>
</header>
```

### Step 5: Mobile-Friendly Version

For mobile, you might want to add a floating action button or bottom bar:

```tsx
{/* Mobile fork buttons - show at bottom on small screens */}
{authLoaded && entityType === "conversation" && (
  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 sm:hidden z-50">
    <div className="flex gap-2 max-w-md mx-auto">
      <Button
        onClick={handleForkPrivate}
        disabled={!!isForking}
        variant="outline"
        className="flex-1"
      >
        {isForking === "private" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <GitFork className="h-4 w-4 mr-2" />
            Private
          </>
        )}
      </Button>
      <Button
        onClick={handleForkCollaborative}
        disabled={!!isForking}
        variant="default"
        className="flex-1"
      >
        {isForking === "collab" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Users className="h-4 w-4 mr-2" />
            Collaborate
          </>
        )}
      </Button>
    </div>
    {forkError && (
      <p className="text-xs text-destructive text-center mt-2">{forkError}</p>
    )}
  </div>
)}
```

### Step 6: Handle Sign-In Redirect

When user is redirected back after sign-in, they should land on the share page and can then click the button again. The URL `/sign-in?redirect_url=/share/${shareId}` handles this.

No additional code needed - Clerk handles the redirect automatically.

### Step 7: Add Tooltip for Unauthenticated Users (Optional)

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Wrap buttons for unauthenticated users
{!isSignedIn && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button onClick={handleForkCollaborative} variant="default" size="sm">
        <Users className="h-4 w-4 mr-2" />
        Continue with Creator
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Sign in to continue this conversation</p>
    </TooltipContent>
  </Tooltip>
)}
```

---

## Complete Implementation Example

Here's a more complete example of the header section:

```tsx
{/* Share Page Header with Fork Buttons */}
<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
  <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-5xl mx-auto">
    {/* Left: Logo + Title */}
    <div className="flex items-center gap-4 min-w-0">
      <Link
        href="/"
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <Logo size="md" />
      </Link>
      <div className="h-6 w-px bg-border/50 hidden md:block flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        {entityType === "conversation" && (
          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        {entityType === "note" && (
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <h1 className="text-sm md:text-base font-semibold truncate">
          {share?.title || "Shared Content"}
        </h1>
      </div>
    </div>

    {/* Right: Actions */}
    <div className="flex-shrink-0 ml-4 flex items-center gap-2">
      {/* Fork error */}
      {forkError && (
        <span className="text-xs text-destructive hidden lg:inline max-w-[200px] truncate">
          {forkError}
        </span>
      )}

      {/* Conversation fork buttons */}
      {authLoaded && entityType === "conversation" && verified && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleForkPrivate}
            disabled={!!isForking}
            variant="outline"
            size="sm"
            className="hidden md:flex"
          >
            {isForking === "private" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden lg:inline">Importing...</span>
              </>
            ) : (
              <>
                <GitFork className="h-4 w-4 md:mr-2" />
                <span className="hidden lg:inline">Continue Privately</span>
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
                <span className="hidden md:inline">Creating...</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Continue with Creator</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Note save button */}
      {authLoaded && entityType === "note" && verified && (
        <Button
          onClick={handleForkPrivate}
          disabled={!!isForking}
          variant="default"
          size="sm"
        >
          {isForking === "private" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save to My Notes"
          )}
        </Button>
      )}

      <ThemeToggle />
    </div>
  </div>
</header>
```

---

## Testing Checklist

### Button Visibility

- [ ] Conversation share: Both buttons visible (desktop)
- [ ] Conversation share: Buttons visible (mobile)
- [ ] Note share: Only "Save to My Notes" visible
- [ ] Not verified: No buttons shown
- [ ] Auth loading: Buttons not shown yet

### Fork Private Flow

1. **Signed in**:
   - [ ] Click "Continue Privately"
   - [ ] Loading state shown
   - [ ] Redirected to new conversation
   - [ ] New conversation in sidebar

2. **Not signed in**:
   - [ ] Click "Continue Privately"
   - [ ] Redirected to sign-in
   - [ ] After sign-in, back to share page
   - [ ] Click again → works

### Fork Collaborative Flow

1. **Signed in (different from creator)**:
   - [ ] Click "Continue with Creator"
   - [ ] Loading state shown
   - [ ] Redirected to collaborative conversation
   - [ ] Both users see conversation in sidebar

2. **Signed in as creator**:
   - [ ] Click "Continue with Creator"
   - [ ] Error: "Cannot collaborate with yourself"
   - [ ] Error message displayed

### Error States

- [ ] Invalid share → error message
- [ ] Expired share → error message
- [ ] Network error → error message displayed
- [ ] Can try again after error

### Mobile Experience

- [ ] Buttons responsive on small screens
- [ ] Touch targets adequate size
- [ ] Loading states clear
- [ ] Error messages visible

---

## Troubleshooting

### Buttons not showing

**Cause**: `authLoaded` is false, or `entityType` doesn't match

**Solution**:
1. Check `useAuth()` is from `@clerk/nextjs`
2. Verify `entityType` is set correctly
3. Check `verified` state is true

### "Cannot collaborate with yourself" showing unexpectedly

**Cause**: User is the original conversation owner

**Solution**: This is expected behavior. User should use "Continue Privately" instead.

### Redirect loop after sign-in

**Cause**: Redirect URL not being preserved

**Solution**:
1. Check Clerk redirect URL handling
2. Verify `/sign-in` page accepts `redirect_url` param

### Fork succeeds but no redirect

**Cause**: Router not navigating

**Solution**:
1. Ensure `useRouter` is from `next/navigation`
2. Check no errors are swallowing the navigation

---

## UX Notes

### Button Labels

| Context | Primary Button | Secondary Button |
|---------|----------------|------------------|
| Conversation (desktop) | Continue with Creator | Continue Privately |
| Conversation (mobile) | Collaborate | Private |
| Note | Save to My Notes | (none) |

### Loading States

- Primary button shows spinner + "Creating..."
- Secondary button shows spinner + "Importing..."
- Both buttons disabled during any fork operation

### Error Display

- Desktop: Error text next to buttons
- Mobile: Error below buttons in fixed bar
- Auto-clear error on retry

---

## Next Steps

After completing Phase 5:
- Phase 4 (Conversation Access) should be done for full functionality
- Phase 6 (Notification UI) completes the notification bell
- Phase 7 (Sidebar Indicator) adds visual indicator

**User testing**: With Phase 5 complete, the core fork flow is usable. Test end-to-end before proceeding.

---

## Summary

This phase adds the fork UI:

| Component | Description |
|-----------|-------------|
| Fork Private button | Creates private copy |
| Fork Collaborative button | Creates shared copy |
| Loading states | Spinners during operation |
| Error handling | Display and retry |
| Sign-in redirect | Unauthenticated flow |

**Total time**: 1-2 hours (including testing)

**Next**: User testing, then Phase 6 (Notification UI)
