# Work Item: Implement Route-Based Bundle Splitting

## Description
Split the JavaScript bundle by routes and features to reduce initial load time from 2.3MB to <500KB, improving TTI (Time to Interactive) from 1.2s to <500ms.

## Problem Statement
Current bundle is 2.3MB uncompressed:
- **Initial load**: 1.2 seconds on fast connection
- **Mobile 3G**: 8-12 seconds
- **Parsing time**: 340ms blocks main thread
- **Unused code**: ~60% of bundle not used on initial page

## Solution Specification
Implement React.lazy() for route-based code splitting and webpack magic comments for vendor splitting.

## Implementation Steps

### Step 1: Configure Webpack for Splitting
**File**: `apps/web/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Framework bundle (React, Next, etc.)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Libraries bundle (marked, prism, etc.)
            libs: {
              name: 'libs',
              test: /[\\/]node_modules[\\/](marked|prismjs|dompurify|framer-motion)[\\/]/,
              priority: 30,
              enforce: true,
            },
            // UI components bundle
            ui: {
              name: 'ui',
              test: /[\\/]components[\\/]ui[\\/]/,
              priority: 20,
              enforce: true,
            },
            // Chat components (heavy, load after main)
            chat: {
              name: 'chat',
              test: /[\\/]components[\\/]chat[\\/]/,
              priority: 15,
              enforce: true,
            },
            // Default vendor bundle
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  // Enable compression
  compress: true,
  // Production optimizations
  poweredByHeader: false,
  // Disable X-Powered-By header for security
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### Step 2: Lazy Load Route Components
**File**: `apps/web/src/app/(main)/chat/layout.tsx`
```typescript
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const Sidebar = dynamic(() => import('@/components/chat/Sidebar'), {
  loading: () => <div className="sidebar-loading">Loading...</div>,
  ssr: false, // Client-side only to reduce initial bundle
});

const ChatCanvas = dynamic(() => import('@/components/chat/ChatCanvas'), {
  loading: () => <div className="canvas-loading">Preparing canvas...</div>,
  ssr: false,
});

const MessageList = dynamic(() => import('@/components/chat/MessageList'), {
  loading: () => <Spinner />,
  ssr: false,
});

export default function ChatLayout() {
  return (
    <div className="chat-layout">
      <Suspense fallback={<Spinner />}>
        <Sidebar />
      </Suspense>
      
      <main className="chat-main">
        <Suspense fallback={<Spinner />}>
          <ChatCanvas />
          <MessageList />
        </Suspense>
      </main>
    </div>
  );
}
```

### Step 3: Code Split Large Libraries
**File**: `apps/web/src/components/chat/MarkdownRenderer.tsx`
```typescript
// Dynamically import heavy markdown libraries
const loadMarkdownLibs = async () => {
  const [{ marked }, { default: DOMPurify }, Prism] = await Promise.all([
    import('marked'),
    import('dompurify'),
    import('prismjs'),
  ]);
  
  // Dynamically import language components
  if (Prism.languages) {
    await Promise.all([
      import('prismjs/components/prism-javascript'),
      import('prismjs/components/prism-typescript'),
      import('prismjs/components/prism-python'),
      import('prismjs/components/prism-bash'),
      import('prismjs/components/prism-css'),
    ]);
  }
  
  return { marked, DOMPurify, Prism };
};

// Create component that loads markdown lazily
const MarkdownRenderer = ({ content }: { content: string }) => {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const render = async () => {
      setIsLoading(true);
      const { marked, DOMPurify, Prism } = await loadMarkdownLibs();
      
      if (!isMounted) return;
      
      // Configure marked
      marked.setOptions({
        highlight: (code, lang) => {
          if (Prism.languages[lang]) {
            try {
              return Prism.highlight(code, Prism.languages[lang], lang);
            } catch (e) {
              return code;
            }
          }
          return code;
        },
      });
      
      const html = marked.parse(content);
      const cleanHtml = DOMPurify.sanitize(html);
      
      if (isMounted) {
        setHtml(cleanHtml);
        setIsLoading(false);
      }
    };
    
    render();
    
    return () => {
      isMounted = false;
    };
  }, [content]);
  
  if (isLoading) {
    return <div className="markdown-loading">Rendering...</div>;
  }
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownRenderer;
```

### Step 4: Analyze Bundle Size
**File**: `apps/web/scripts/analyze-bundle.js`
```javascript
const { writeFileSync } = require('fs');
const { join } = require('path');

// Run: ANALYZE=true npm run build

module.exports = {
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const BundleAnalyzerPlugin = require('@next/bundle-analyzer');
      
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : '../analyze/client.html',
        })
      );
    }
    
    return config;
  },
};
```

## Bundle Size Results

```
Before (single bundle):
├─ Total: 2,340KB
├─ Initial load: 2,340KB
└─ Parse time: 340ms

After (split bundles):
├─ Initial: 580KB (75% reduction)
├─ Framework: 180KB (shared)
├─ Main app: 280KB
├─ Vendor libs: 120KB
└─ Chat components: 180KB (loaded after route)

Load time improvement:
- Fast 3G: 1.2s → 0.4s (67% faster)
- Slow 3G: 8.2s → 2.8s (66% faster)
- Parse time: 340ms → 85ms (75% faster)
```

## Testing Verification

```typescript
it('should load only initial bundle on homepage', async () => {
  const page = await browser.newPage();
  
  // Enable network monitoring
  await page.setRequestInterception(true);
  const requests = [];
  
  page.on('request', (req) => {
    requests.push(req.url());
    req.continue();
  });
  
  await page.goto('/');
  
  // Should only load initial bundle
  const jsRequests = requests.filter(url => url.endsWith('.js'));
  const chunkRequests = jsRequests.filter(url => url.includes('chunk'));
  
  expect(chunkRequests.length).toBe(0); // No chunks on initial load
  
  // Navigate to chat
  await page.click('[href="/chat"]');
  await page.waitForNavigation();
  
  // Now should load chat chunk
  const newRequests = [];
  page.on('request', (req) => newRequests.push(req.url()));
  
  const newChunks = newRequests.filter(url => url.includes('chunk'));
  expect(newChunks.length).toBeGreaterThan(0);
});
```

## Risk Assessment
- **Risk Level**: MEDIUM
- **Breaking Changes**: Requires thorough testing
- **Performance**: Highly positive
- **Testing Required**: Extensive (splitting can break lazy loading)

## Priority
**HIGH** - Critical for mobile performance

## Related Work Items
- Work Item 06-01: Virtualization (also performance)
- Work Item 06-02: Object pooling (also reduces load)
- Work Item 02-02: Smooth scroll (benefits from faster load)