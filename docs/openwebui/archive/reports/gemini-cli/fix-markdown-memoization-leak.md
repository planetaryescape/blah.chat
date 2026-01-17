# Fix: Markdown Memoization Leak

**Context:**
`MarkdownContent` renders the chat message text using `Streamdown`.

**The Issue:**
Inside the component body, `createMarkdownComponents()` is called on *every render*.
```typescript
const markdownComponents = createMarkdownComponents(); // New reference every time
```
This causes the child `Streamdown` component to re-render fully on every update (e.g., every cursor blink or token), bypassing `React.memo` and hurting performance.

**Target File:**
`apps/web/src/components/chat/MarkdownContent.tsx`

**Proposed Solution:**
Memoize the components object.

**Implementation Details:**
```typescript
const markdownComponents = useMemo(() => createMarkdownComponents(), []);
```
Or move the `createMarkdownComponents` function call outside the component if it doesn't depend on props.
