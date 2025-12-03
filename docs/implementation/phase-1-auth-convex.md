# Phase 1: Authentication & Convex Setup

**Goal**: Working Next.js app with Clerk auth + Convex database connected.

**Status**: Ready to start
**Dependencies**: Phase 0 (design system)
**Estimated Effort**: Foundation phase, ~1-2 days

---

## Overview

Set up core infrastructure: Clerk for auth, Convex for real-time database. Users can sign up/in, protected routes work, Convex sync established.

---

## Architecture

```
User → Clerk (Auth) → Next.js App → Convex (Database)
                           ↓
                    Webhook sync: Clerk → Convex
```

**Flow**:
1. User signs up via Clerk
2. Clerk webhook fires
3. Next.js webhook handler creates user in Convex
4. User can access protected routes
5. All Convex queries/mutations require auth

---

## Tasks

### 1. Install Dependencies

```bash
npm install convex @clerk/nextjs @clerk/clerk-sdk-node pino pino-pretty
npm install -D @types/node
```

**Packages**:
- `convex` - Convex client + hooks
- `@clerk/nextjs` - Clerk Next.js integration
- `@clerk/clerk-sdk-node` - Server-side Clerk SDK (for webhook verification)
- `pino` - Structured logging
- `pino-pretty` - Dev-friendly log formatting

---

### 2. Set Up Convex

**Initialize Convex**:
```bash
npx convex dev
```

This creates:
- `convex/` directory
- `convex.json` config
- `.env.local` with `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOY_KEY`

**Create initial schema**:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
});
```

**Run schema**:
```bash
npx convex dev
```

Convex will sync schema automatically.

---

### 3. Set Up Clerk

**Sign up**: https://clerk.com
**Create application**: Choose "Next.js"
**Get keys**: Dashboard → API Keys

**Add to `.env.local`**:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_... # Get from Clerk dashboard → Webhooks
```

**Middleware** (protect routes):

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

---

### 4. Clerk + Convex Integration

**Root layout** (Clerk provider):

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexClientProvider } from './ConvexClientProvider';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Convex provider** (with Clerk auth):

```typescript
// app/ConvexClientProvider.tsx
'use client';

import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

---

### 5. Authentication Pages

**Sign In**:

```typescript
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
```

**Sign Up**:

```typescript
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
```

**Styling Clerk components** (match theme):

```typescript
// app/layout.tsx - add to ClerkProvider
<ClerkProvider
  appearance={{
    variables: {
      colorPrimary: 'hsl(var(--primary))',
      colorBackground: 'hsl(var(--background))',
      colorText: 'hsl(var(--foreground))',
      colorInputBackground: 'hsl(var(--input))',
      colorInputText: 'hsl(var(--foreground))',
    },
    elements: {
      formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      card: 'bg-card',
      headerTitle: 'text-foreground',
      headerSubtitle: 'text-muted-foreground',
    },
  }}
>
```

---

### 6. Webhook: Clerk → Convex User Sync

**Create webhook endpoint**:

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Webhook verification failed', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await convex.mutation(api.users.create, {
      clerkId: id,
      email: email_addresses[0].email_address,
      name: `${first_name || ''} ${last_name || ''}`.trim() || undefined,
      imageUrl: image_url,
    });
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await convex.mutation(api.users.update, {
      clerkId: id,
      email: email_addresses[0].email_address,
      name: `${first_name || ''} ${last_name || ''}`.trim() || undefined,
      imageUrl: image_url,
    });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (id) {
      await convex.mutation(api.users.deleteByClerkId, {
        clerkId: id,
      });
    }
  }

  return new Response('Webhook processed', { status: 200 });
}
```

**Convex mutations**:

```typescript
// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const update = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      updatedAt: Date.now(),
    });
  },
});

export const deleteByClerkId = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});
```

**Configure webhook in Clerk**:
1. Clerk Dashboard → Webhooks → Add Endpoint
2. Endpoint URL: `https://your-domain.com/api/webhooks/clerk` (use ngrok for local dev)
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret → add to `.env.local` as `CLERK_WEBHOOK_SECRET`

---

### 7. Protected Routes & Layout

**Main layout** (authenticated):

```typescript
// app/(main)/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar placeholder */}
      <aside className="w-64 border-r bg-muted/10">
        <div className="p-4">
          <h2 className="text-lg font-semibold">blah.chat</h2>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Home page** (redirects to chat):

```typescript
// app/(main)/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/chat');
}
```

**Chat page** (placeholder):

```typescript
// app/(main)/chat/page.tsx
export default function ChatPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Welcome to blah.chat</h1>
        <p className="text-muted-foreground">Start a new conversation</p>
      </div>
    </div>
  );
}
```

---

### 8. Logging Setup

**Pino logger**:

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});
```

**Usage in API routes**:

```typescript
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  logger.info({ event: 'webhook_received', type: eventType });
  // ...
}
```

---

## Environment Variables

**Complete `.env.local`**:

```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOY_KEY=... # For production deployment

# Logging
LOG_LEVEL=info
```

**Security**: Add `.env.local` to `.gitignore` (should already be there)

---

## Testing

**Test flow**:
1. Start dev server: `npm run dev`
2. Start Convex: `npx convex dev` (separate terminal)
3. Navigate to `/sign-up`
4. Create account
5. Check Convex dashboard → `users` table → see new user
6. Sign out → sign in → verify works
7. Try accessing `/chat` without auth → redirects to `/sign-in`

**Webhook testing** (local):
1. Install ngrok: `npm i -g ngrok`
2. Run: `ngrok http 3000`
3. Copy ngrok URL → Clerk webhook endpoint
4. Test user creation → check logs

---

## Deliverables

1. Convex initialized, schema deployed
2. Clerk auth working (sign up, sign in, sign out)
3. Middleware protecting routes
4. Webhook syncing users to Convex
5. Protected layout with sidebar placeholder
6. Logging infrastructure ready
7. All environment variables configured

---

## Acceptance Criteria

- [ ] User can sign up via Clerk
- [ ] User record created in Convex
- [ ] User can sign in
- [ ] Protected routes require auth
- [ ] Unauthenticated users redirected to `/sign-in`
- [ ] Authenticated users see main layout
- [ ] Webhook logs show successful user sync
- [ ] No TypeScript errors
- [ ] No console errors

---

## Next Steps

Phase 2A: Implement core chat functionality with resilient generation.

---

## Troubleshooting

**Clerk styles not matching theme**:
- Verify `appearance` prop in `ClerkProvider`
- Check CSS variables in `globals.css`

**Webhook not firing**:
- Verify ngrok URL is correct
- Check Clerk dashboard → Webhooks → Recent events
- Verify `CLERK_WEBHOOK_SECRET` matches dashboard

**Convex auth not working**:
- Verify `ConvexProviderWithClerk` is used
- Check `useAuth` is from `@clerk/nextjs`
- Ensure Clerk session is active

**TypeScript errors**:
- Run `npx convex dev` to regenerate types
- Restart TypeScript server in editor
