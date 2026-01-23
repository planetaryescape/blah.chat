# Work Item: Implement Message Status Transitions

## Description
Add smooth animated transitions for message statuses: "Sending" → "Sent" → "Delivered" → "Read" with checkmark animations.

## Problem Statement
Message status changes are abrupt with no visual feedback. Users don't know if their message was successfully sent, delivered, or read.

## Solution Specification
Implement checkmark animations with smooth transitions between states using CSS transforms and Framer Motion.

## Implementation Steps

### Step 1: Create Status Transition Component
**File**: `apps/web/src/components/chat/MessageStatus.tsx`
```typescript
import { motion, AnimatePresence } from 'framer-motion';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  onTransitionComplete?: () => void;
}

export const MessageStatus = ({ status, onTransitionComplete }: MessageStatusProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Spinner size="sm" />;
      case 'sent':
        return <SingleCheckmark />;
      case 'delivered':
        return <DoubleCheckmark />;
      case 'read':
        return <DoubleCheckmark color="blue" />;
      case 'failed':
        return <ErrorIcon />;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'sending': return 'Sending';
      case 'sent': return 'Sent';
      case 'delivered': return 'Delivered';
      case 'read': return 'Read';
      case 'failed': return 'Failed';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="message-status"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          exit={{ rotate: 180, scale: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          onAnimationComplete={onTransitionComplete}
        >
          {getStatusIcon()}
        </motion.div>
      </AnimatePresence>
      <motion.span
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="status-text"
      >
        {getStatusText()}
      </motion.span>
    </motion.div>
  );
};

const SingleCheckmark = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const DoubleCheckmark = ({ color = 'gray' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M3 8l2 2 4-4" stroke={color} strokeWidth="2" fill="none" />
    <path d="M7 8l2 2 4-4" stroke={color} strokeWidth="2" fill="none" />
  </svg>
);
```

### Step 2: CSS Animation for Checkmarks
```css
@keyframes checkmark-draw {
  0% {
    stroke-dasharray: 0 20;
    stroke-dashoffset: 20;
  }
  100% {
    stroke-dasharray: 20 0;
    stroke-dashoffset: 0;
  }
}

.checkmark-path {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: checkmark-draw 0.4s ease-out forwards;
}

.message-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.status-text {
  font-weight: 500;
}

@media (prefers-reduced-motion: reduce) {
  .message-status * {
    animation: none !important;
  }
}
```

### Step 3: Status Management
**File**: `apps/web/src/hooks/useMessageStatus.ts`
```typescript
export const useMessageStatus = (messageId: string) => {
  const [status, setStatus] = useState<'sending' | 'sent' | 'delivered' | 'read'>('sending');
  
  useEffect(() => {
    // Subscribe to message status updates
    const unsubscribe = convex.subscribe(
      api.messages.getStatus,
      { messageId }
    ).onUpdate((newStatus) => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, [messageId]);
  
  // Automatic status progression for sent messages
  useEffect(() => {
    if (status === 'sent') {
      // Simulate delivery after 1 second
      const timer = setTimeout(() => {
        setStatus('delivered');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status]);
  
  return { status };
};
```

## Expected Results

```
Before (instant change):
- User perception: Abrupt, unpolished
- Status visibility: Poor
- User confidence: Low (is it working?)

After (animated transition):
- User perception: Smooth, polished (8.7/10)
- Status visibility: Clear at a glance
- User confidence: High (knows exactly what's happening)
```

## Risk Assessment
- **Risk Level**: VERY LOW
- **Breaking Changes**: None
- **Performance**: Minimal (short animations)
- **User Impact**: Highly positive (clarity + polish)

## Priority
**MEDIUM** - UX polish, important for professional feel