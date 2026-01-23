# Fix: Streaming Layout Shifts (Images)

**Context:**
Images rendered during markdown streaming.

**The Issue:**
`<img>` tags have a generic hardcoded `minHeight: 100px` (or similar). This causes content to jump (pop-in) when the real image loads, or leaves ugly gaps if the image is small.

**Target File:**
`apps/web/src/components/chat/MarkdownContent.tsx` (inside `createMarkdownComponents`)

**Proposed Solution:**
Use a Skeleton wrapper for images.

**Implementation Details:**
- Create an `ImageWithSkeleton` component.
- **State:** `[isLoaded, setIsLoaded]`.
- **Render:**
  ```tsx
  <div className="relative">
    {!isLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
    <img 
      onLoad={() => setIsLoaded(true)} 
      className={cn(className, !isLoaded && "opacity-0")} 
      {...props} 
    />
  </div>
  ```
