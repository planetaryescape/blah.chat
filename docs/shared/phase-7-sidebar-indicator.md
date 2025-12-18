# Phase 7: Sidebar Indicator

**Duration**: 30 minutes
**Dependencies**: Phase 1 (Schema)
**Parallel Work**: Can run after Phase 1, independent of other phases

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why This Phase?

Users need to visually identify which conversations are collaborative (shared with another user) vs. private. This phase adds a small Users icon indicator in the sidebar.

---

## Current State

### Existing Sidebar Indicators

**File**: `src/components/sidebar/ConversationItem.tsx`

Current indicators (around line 197):
- **Branch icon** (GitBranch) - `parentConversationId` exists
- **Project badge** (FolderOpen) - `projectId` exists
- **Star icon** (Star) - `starred === true`
- **Pin icon** (Pin) - `pinned === true`

### From Phase 1

- `isCollaborative` field exists on conversations
- Field is `true` for collaborative, `undefined`/`false` for private

---

## Phase Goals

By the end of this phase:
1. ✅ Blue Users icon shows for collaborative conversations
2. ✅ Tooltip explains "Collaborative conversation"
3. ✅ Consistent with existing indicator patterns

---

## Prerequisites

- [ ] Phase 1 complete (schema with `isCollaborative` field)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Open ConversationItem File

**File**: `src/components/sidebar/ConversationItem.tsx`

### Step 2: Add Import

Find the imports section and add `Users`:

```typescript
import {
  GitBranch,
  Star,
  Pin,
  FolderOpen,
  Users,  // Add this
  // ... other icons
} from "lucide-react";
```

### Step 3: Find Indicators Section

Look for the section with existing indicators. It will look something like:

```tsx
{/* Indicators section */}
<div className="flex items-center gap-1">
  {/* Branch indicator */}
  {conversation.parentConversationId && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0 ...">
          <GitBranch className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent>Branch conversation</TooltipContent>
    </Tooltip>
  )}

  {/* Project indicator */}
  {/* ... */}

  {/* Star indicator */}
  {/* ... */}

  {/* Pin indicator */}
  {/* ... */}
</div>
```

### Step 4: Add Collaborative Indicator

Add the collaborative indicator after the branch indicator (or wherever makes most sense in the visual order):

```tsx
{/* Collaborative indicator */}
{conversation.isCollaborative && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 flex items-center justify-center text-blue-500">
        <Users className="h-3 w-3" />
      </div>
    </TooltipTrigger>
    <TooltipContent side="right">
      <p>Collaborative conversation</p>
    </TooltipContent>
  </Tooltip>
)}
```

### Step 5: Complete Indicators Section Example

Here's what the full indicators section should look like:

```tsx
{/* Right side indicators */}
<div className="flex items-center gap-0.5 shrink-0">
  {/* Branch indicator */}
  {conversation.parentConversationId && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
          <GitBranch className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Branch conversation</p>
      </TooltipContent>
    </Tooltip>
  )}

  {/* Collaborative indicator */}
  {conversation.isCollaborative && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 flex items-center justify-center text-blue-500">
          <Users className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Collaborative conversation</p>
      </TooltipContent>
    </Tooltip>
  )}

  {/* Project indicator */}
  {conversation.projectId && project && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0">
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
            <FolderOpen className="h-3 w-3" />
            <span className="truncate max-w-[60px]">{project.name}</span>
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Project: {project.name}</p>
      </TooltipContent>
    </Tooltip>
  )}

  {/* Star indicator */}
  {conversation.starred && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 flex items-center justify-center text-yellow-500">
          <Star className="h-3 w-3 fill-current" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Starred</p>
      </TooltipContent>
    </Tooltip>
  )}

  {/* Pin indicator */}
  {conversation.pinned && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0 h-5 w-5 min-w-0 min-h-0 p-0.5 flex items-center justify-center text-primary">
          <Pin className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>Pinned</p>
      </TooltipContent>
    </Tooltip>
  )}
</div>
```

### Step 6: Verify TypeScript Types

The `conversation` object should already include `isCollaborative` from the Convex types. If you see a TypeScript error, verify:

1. Convex types are regenerated (`bunx convex dev`)
2. The conversation type includes the field:

```typescript
interface Conversation {
  // ... other fields
  isCollaborative?: boolean;
}
```

---

## Visual Reference

### Indicator Order (left to right)

| Position | Indicator | Icon | Color | Condition |
|----------|-----------|------|-------|-----------|
| 1 | Branch | GitBranch | Muted → Primary | `parentConversationId` |
| 2 | **Collaborative** | **Users** | **Blue** | **`isCollaborative`** |
| 3 | Project | FolderOpen | Secondary badge | `projectId` |
| 4 | Star | Star | Yellow | `starred` |
| 5 | Pin | Pin | Primary | `pinned` |

### Screenshot Reference

```
┌──────────────────────────────────────────┐
│ 🗨️ Chat with AI about project     👥 ⭐ 📌│
│ 🗨️ Regular conversation              ⭐  │
│ 🗨️ Branched discussion          ⑃        │
│ 🗨️ Shared with John              👥       │
└──────────────────────────────────────────┘
```

---

## Testing Checklist

### Indicator Visibility

- [ ] Blue Users icon visible for collaborative conversations
- [ ] Icon NOT visible for regular (non-collaborative) conversations
- [ ] Icon appears in correct position (after branch, before project)

### Tooltip

- [ ] Hover shows tooltip
- [ ] Tooltip text: "Collaborative conversation"
- [ ] Tooltip appears on correct side (right)

### Styling

- [ ] Icon color is blue (`text-blue-500`)
- [ ] Icon size consistent with other indicators (h-3 w-3)
- [ ] Icon container size consistent (h-5 w-5)

### Multiple Indicators

- [ ] Collaborative + starred shows both icons
- [ ] Collaborative + pinned shows both icons
- [ ] Collaborative + project shows both
- [ ] All indicators together render correctly

### Responsiveness

- [ ] Icons visible when sidebar is narrow
- [ ] Icons don't overflow or wrap unexpectedly
- [ ] Touch target adequate on mobile (if applicable)

---

## Troubleshooting

### Icon not showing

**Cause**: `isCollaborative` is undefined or false

**Solution**:
1. Check conversation in Convex dashboard
2. Verify `isCollaborative: true` is set
3. Ensure Phase 1 schema change is deployed

### TypeScript error on `isCollaborative`

**Cause**: Types not regenerated

**Solution**:
```bash
bunx convex dev
# Wait for types to regenerate
```

### Tooltip not appearing

**Cause**: Missing TooltipProvider or import

**Solution**:
1. Ensure `Tooltip`, `TooltipTrigger`, `TooltipContent` imported
2. Verify `TooltipProvider` wraps the app (usually in layout)

### Icon wrong color

**Cause**: Tailwind class not applied

**Solution**:
1. Check class is `text-blue-500` not `text-blue` or similar
2. Verify no conflicting styles from parent

### Icon wrong size

**Cause**: Container or icon size mismatch

**Solution**:
1. Container: `h-5 w-5`
2. Icon: `h-3 w-3`
3. Padding: `p-0.5`

---

## Styling Alternatives

### Different Blue Shades

```tsx
// Lighter blue
className="text-blue-400"

// Darker blue
className="text-blue-600"

// Primary color instead
className="text-primary"
```

### Animated Indicator

```tsx
<div className="shrink-0 h-5 w-5 ... text-blue-500 animate-pulse">
  <Users className="h-3 w-3" />
</div>
```

### Badge Style (like project)

```tsx
{conversation.isCollaborative && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-blue-500 text-blue-500">
        <Users className="h-3 w-3" />
        <span>Shared</span>
      </Badge>
    </TooltipTrigger>
    <TooltipContent side="right">
      <p>Collaborative conversation</p>
    </TooltipContent>
  </Tooltip>
)}
```

---

## Future Enhancements

### Show Participant Count

```tsx
{conversation.isCollaborative && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="shrink-0 flex items-center gap-0.5 text-blue-500">
        <Users className="h-3 w-3" />
        <span className="text-[10px]">2</span>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>2 participants</p>
    </TooltipContent>
  </Tooltip>
)}
```

### Show Participant Avatars

```tsx
{conversation.isCollaborative && participants && (
  <div className="flex -space-x-1">
    {participants.slice(0, 3).map((p) => (
      <Avatar key={p._id} className="h-4 w-4 border border-background">
        <AvatarImage src={p.user?.imageUrl} />
        <AvatarFallback className="text-[8px]">
          {p.user?.name?.[0]}
        </AvatarFallback>
      </Avatar>
    ))}
  </div>
)}
```

---

## Summary

This phase adds the collaborative conversation indicator:

| Component | Description |
|-----------|-------------|
| Users icon | Blue icon in sidebar |
| Tooltip | "Collaborative conversation" |
| Condition | `isCollaborative === true` |

**Styling**:
- Icon: `Users` from lucide-react
- Color: `text-blue-500`
- Size: `h-3 w-3` icon in `h-5 w-5` container
- Position: After branch indicator, before project badge

**Total time**: 30 minutes (including testing)

**Next**: Full feature testing with all phases complete
