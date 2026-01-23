# Delete Confirmation

> **Priority**: P3 (Safety)
> **Effort**: Low (1-2 hours)
> **Impact**: Medium - Prevents accidental data loss

---

## Summary

Add a confirmation dialog before deleting messages or conversations to prevent accidental data loss. Currently, deletion happens immediately without warning.

---

## Current State

**File**: `apps/web/src/components/chat/MessageActionsMenu.tsx`

```typescript
// Current: Direct delete without confirmation
const handleDelete = async () => {
  await deleteMessage({ messageId: message._id });
  toast.success("Message deleted");
};
```

**No confirmation dialog** - clicking delete immediately removes the message.

---

## Problem

### Why Confirmation Matters

1. **Irreversible Action**: Deleted messages cannot be recovered
2. **Accidental Clicks**: Especially on mobile, users may tap wrong button
3. **Cascade Effects**: Deleting a message removes associated tool calls, sources
4. **User Trust**: Users expect confirmation for destructive actions
5. **Industry Standard**: Most apps confirm before permanent deletion

### Current Risk

- Single click deletes permanently
- No undo option
- No "are you sure?" prompt
- Mobile especially prone to accidental taps

---

## Solution

### Option A: Confirmation Dialog (Recommended)

```typescript
// apps/web/src/components/chat/MessageActionsMenu.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function MessageActionsMenu({ message, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => e.preventDefault()} // Prevent menu close
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            message and any associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Option B: Undo Toast (Alternative)

Instead of pre-confirmation, allow undo after deletion:

```typescript
const handleDelete = async () => {
  // Store message data for potential undo
  const deletedMessage = { ...message };

  // Optimistically remove from UI
  removeMessageFromUI(message._id);

  // Show undo toast
  toast("Message deleted", {
    action: {
      label: "Undo",
      onClick: async () => {
        // Restore message
        await restoreMessage(deletedMessage);
        toast.success("Message restored");
      },
    },
    duration: 5000, // 5 seconds to undo
  });

  // Actually delete after toast duration
  setTimeout(async () => {
    await deleteMessage({ messageId: message._id });
  }, 5000);
};
```

### Option C: Hold-to-Delete (Mobile)

For mobile, require holding the delete button:

```typescript
function HoldToDeleteButton({ onDelete }) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const handleTouchStart = () => {
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          onDelete();
          return 0;
        }
        return p + 10;
      });
    }, 50); // 500ms total to delete
  };

  const handleTouchEnd = () => {
    clearInterval(timerRef.current);
    setProgress(0);
  };

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className="relative"
    >
      <span>Hold to Delete</span>
      {progress > 0 && (
        <div
          className="absolute inset-0 bg-destructive/20"
          style={{ width: `${progress}%` }}
        />
      )}
    </button>
  );
}
```

### Recommendation

Use **Option A (Confirmation Dialog)** for desktop and **Option B (Undo Toast)** for mobile, with a user preference to disable confirmations.

### User Preference (Optional)

```typescript
// Allow power users to skip confirmation
const [confirmBeforeDelete] = useUserPreference('confirmBeforeDelete', true);

if (confirmBeforeDelete) {
  // Show dialog
} else {
  // Direct delete with undo toast
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/MessageActionsMenu.tsx` | Add dialog |
| `apps/web/src/components/chat/MessageActions.tsx` | Desktop delete action |
| `apps/web/src/components/chat/MessageActionsMenuMobile.tsx` | Mobile delete |
| `apps/web/src/app/(main)/settings/preferences/page.tsx` | Optional toggle |

---

## Testing

### Manual Testing

1. Click delete on a message
2. **Expected**: Confirmation dialog appears
3. Click Cancel
4. **Expected**: Dialog closes, message remains
5. Click Delete
6. **Expected**: Message is deleted, toast confirms

### Edge Cases

- [ ] Delete while generating - should work or be disabled?
- [ ] Delete last message in conversation - handle empty state
- [ ] Rapid delete attempts - prevent double-delete
- [ ] Keyboard navigation - Escape should cancel

---

## References

### shadcn/ui AlertDialog

```typescript
// Standard usage from shadcn
<AlertDialog>
  <AlertDialogTrigger>Open</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Notes

- **Keep dialog text concise** - users should understand quickly
- **Destructive button styling** - use red/destructive variant
- **Keyboard accessible** - Tab, Enter, Escape should work
- **Mobile friendly** - dialog should work well on small screens
- **Don't over-confirm** - only for truly destructive actions
