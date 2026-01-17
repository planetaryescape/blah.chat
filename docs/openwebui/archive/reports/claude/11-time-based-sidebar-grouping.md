# Time-Based Sidebar Grouping

> **Priority**: P2 (Navigation)
> **Effort**: Medium (3-4 hours)
> **Impact**: Medium - Improves conversation findability

---

## Summary

Group conversations in the sidebar by time period (Today, Yesterday, Previous 7 Days, Previous 30 Days, Older) to help users find recent conversations more easily.

---

## Current State

**File**: `apps/web/src/components/sidebar/ConversationList.tsx` (or similar)

### Current Behavior

Conversations are listed chronologically without grouping:
- Sorted by `lastMessageAt` (most recent first)
- No visual separation between time periods
- Users must scroll and rely on memory to find conversations

---

## Problem

### Why Time Grouping Helps

1. **Mental Model**: Users think "that conversation from yesterday" not "conversation #47"
2. **Quick Scanning**: Group headers let users skip irrelevant time periods
3. **Reduced Cognitive Load**: Clear organization reduces search friction
4. **Industry Standard**: Gmail, Slack, Notion all use time-based grouping

### What Open WebUI Does

```svelte
<!-- From Open WebUI Sidebar.svelte -->
{#if idx === 0 || (idx > 0 && chat.time_range !== $chats[idx - 1].time_range)}
  <div class="section-header">{chat.time_range}</div>
{/if}
```

They compute `time_range` for each conversation and show headers when the range changes.

---

## Solution

### 1. Time Range Utility

**File**: `apps/web/src/lib/utils/timeRanges.ts`

```typescript
export type TimeRange =
  | 'Today'
  | 'Yesterday'
  | 'Previous 7 Days'
  | 'Previous 30 Days'
  | 'Older';

export function getTimeRange(date: Date | number): TimeRange {
  const now = new Date();
  const target = new Date(date);

  // Reset to start of day for comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekAgoStart = new Date(todayStart);
  weekAgoStart.setDate(weekAgoStart.getDate() - 7);
  const monthAgoStart = new Date(todayStart);
  monthAgoStart.setDate(monthAgoStart.getDate() - 30);

  if (target >= todayStart) {
    return 'Today';
  } else if (target >= yesterdayStart) {
    return 'Yesterday';
  } else if (target >= weekAgoStart) {
    return 'Previous 7 Days';
  } else if (target >= monthAgoStart) {
    return 'Previous 30 Days';
  } else {
    return 'Older';
  }
}

// Group conversations by time range
export function groupByTimeRange<T extends { lastMessageAt: number }>(
  items: T[]
): Map<TimeRange, T[]> {
  const groups = new Map<TimeRange, T[]>();
  const order: TimeRange[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  // Initialize empty groups in order
  for (const range of order) {
    groups.set(range, []);
  }

  // Sort items into groups
  for (const item of items) {
    const range = getTimeRange(item.lastMessageAt);
    groups.get(range)!.push(item);
  }

  // Remove empty groups
  for (const range of order) {
    if (groups.get(range)!.length === 0) {
      groups.delete(range);
    }
  }

  return groups;
}
```

### 2. Update Sidebar Component

**File**: `apps/web/src/components/sidebar/ConversationList.tsx`

```typescript
import { groupByTimeRange, TimeRange } from '@/lib/utils/timeRanges';

export function ConversationList({ conversations }) {
  const groupedConversations = useMemo(
    () => groupByTimeRange(conversations),
    [conversations]
  );

  return (
    <div className="space-y-4">
      {Array.from(groupedConversations.entries()).map(([range, items]) => (
        <div key={range}>
          {/* Section header */}
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            {range}
          </div>

          {/* Conversations in this range */}
          <div className="space-y-1">
            {items.map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. Sticky Headers (Optional Enhancement)

Make section headers sticky so users always know which time period they're viewing:

```css
.section-header {
  position: sticky;
  top: 0;
  background: hsl(var(--background) / 0.95);
  backdrop-filter: blur(4px);
  z-index: 10;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border) / 0.5);
}
```

### 4. With Pinned Section

If you have pinned conversations, add that as a special group:

```typescript
type ExtendedTimeRange = 'Pinned' | TimeRange;

function groupConversations(conversations) {
  const pinned = conversations.filter(c => c.isPinned);
  const unpinned = conversations.filter(c => !c.isPinned);

  const groups = new Map<ExtendedTimeRange, Conversation[]>();

  if (pinned.length > 0) {
    groups.set('Pinned', pinned);
  }

  const timeGroups = groupByTimeRange(unpinned);
  for (const [range, items] of timeGroups) {
    groups.set(range, items);
  }

  return groups;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/lib/utils/timeRanges.ts` | Create new utility |
| `apps/web/src/components/sidebar/ConversationList.tsx` | Add grouping logic |
| `apps/web/src/components/sidebar/Sidebar.tsx` | May need adjustments |

---

## Testing

### Manual Testing

1. Create conversations on different days (or mock timestamps)
2. Verify grouping:
   - Conversations from today appear under "Today"
   - Yesterday's under "Yesterday"
   - Etc.
3. Check sticky headers while scrolling
4. Verify empty groups are not shown

### Edge Cases

- [ ] No conversations - should show empty state, not headers
- [ ] All conversations today - only "Today" header
- [ ] Conversation exactly at midnight - correct grouping
- [ ] Timezone handling - uses local time
- [ ] New conversation appears - should go to "Today"
- [ ] Updated conversation - should resort within group

### Unit Tests

```typescript
// __tests__/timeRanges.test.ts
describe('getTimeRange', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns Today for today', () => {
    const today = new Date('2024-01-15T08:00:00');
    expect(getTimeRange(today)).toBe('Today');
  });

  it('returns Yesterday for yesterday', () => {
    const yesterday = new Date('2024-01-14T20:00:00');
    expect(getTimeRange(yesterday)).toBe('Yesterday');
  });

  it('returns Previous 7 Days for 3 days ago', () => {
    const threeDaysAgo = new Date('2024-01-12T12:00:00');
    expect(getTimeRange(threeDaysAgo)).toBe('Previous 7 Days');
  });

  it('returns Previous 30 Days for 2 weeks ago', () => {
    const twoWeeksAgo = new Date('2024-01-01T12:00:00');
    expect(getTimeRange(twoWeeksAgo)).toBe('Previous 30 Days');
  });

  it('returns Older for 2 months ago', () => {
    const twoMonthsAgo = new Date('2023-11-15T12:00:00');
    expect(getTimeRange(twoMonthsAgo)).toBe('Older');
  });
});
```

---

## References

### Open WebUI Pattern

```javascript
// Their time range calculation
function getTimeRange(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const day = 24 * 60 * 60 * 1000;

  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  if (diff < 7 * day) return 'Previous 7 Days';
  if (diff < 30 * day) return 'Previous 30 Days';
  return 'Older';
}
```

### Alternative: Monthly Groups for Older

For very old conversations, consider grouping by month:

```typescript
function getTimeRangeDetailed(date: Date): string {
  // ... existing logic for recent ...

  // For older, use month name
  if (target < monthAgoStart) {
    return target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    // e.g., "December 2023"
  }
}
```

---

## Notes

- **Timezone aware** - uses local time for grouping
- **Performance** - grouping is O(n), run on filtered/paginated list
- **Accessibility** - headers should be announced by screen readers
- **Localization** - consider translating group names
- **Collapsible groups** - optional enhancement for power users
