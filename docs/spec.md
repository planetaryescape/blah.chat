<project>
<overview>
Project Name: blah.chat

Build a personal AI chat assistant application that serves as a self-hosted alternative to ChatGPT. The core motivation is to have full control over the chat experience, reduce subscription costs by using API pricing, support multiple LLM providers in one interface, and implement a custom memory system using RAG that works exactly how I want it to.

This is a serious, production-quality application for personal use. It should feel polished, distinctive, and delightful to use daily.
</overview>

<tech_stack>
<core_framework>

- Next.js (App Router) - Full-stack React framework
- TypeScript - Strict typing throughout
  </core_framework>

<database>
- Convex - Reactive database with built-in vector search capabilities. This is crucial because:
  - Real-time reactivity means chat messages appear instantly without polling
  - Built-in vector search powers the RAG memory system
  - Handles file storage
  - No need for a separate ORM like Drizzle
</database>

<authentication>
- Clerk - Handle all authentication, user management, sessions. Integrate with Convex for user data sync.
</authentication>

<ai_llm>

- Vercel AI SDK - Abstraction layer that allows easy switching between LLM providers (OpenAI, Anthropic, Google, etc.). This is essential because I want to:
  - Switch models mid-conversation or per-conversation
  - Try new models as they release without rebuilding
  - Compare outputs across providers
    </ai_llm>

<ui>
- shadcn/ui - Component primitives
- Tailwind CSS - Styling
- Motion (framer-motion) - Animations and micro-interactions
</ui>

<data_fetching>

- TanStack React Query - Client-side data fetching, caching, and state management. Use alongside Convex's reactive queries where appropriate.
  </data_fetching>

<logging>
- Pino - Structured JSON logging for the backend/API routes
</logging>

<analytics>
- PostHog - Product analytics to understand my own usage patterns. Track:
  - Which models I use most
  - Conversation lengths
  - Feature usage (voice, files, memories)
  - Performance metrics
</analytics>
</tech_stack>

<features>
<chat_interface>
Implement all the standard chat features you'd expect from a modern AI chat app:

- Conversation list - Sidebar showing all conversations, searchable, sorted by recent
- Message thread - Display messages with proper formatting (markdown, code blocks with syntax highlighting, tables, etc.)
- Message input - Expandable textarea with keyboard shortcuts (Cmd+Enter to send)
- Streaming responses - Show AI responses as they stream in, character by character
- Stop generation - Button to cancel mid-stream
- Regenerate response - Re-run the last AI response
- Edit messages - Edit previous user messages and regenerate from that point
- Copy messages - Copy individual messages or code blocks
- Delete messages - Remove specific messages from the conversation
- Conversation management - Rename, delete, archive conversations
  </chat_interface>

<model_selection>

- Model picker - Dropdown or modal to select the active model
- Support at minimum:
  - OpenAI: GPT-4o, GPT-4o-mini, o1, o1-mini, o3-mini
  - Anthropic: Claude 4 Opus, Claude 4 Sonnet, Claude 3.5 Haiku
  - Google: Gemini 2.0 Flash, Gemini 2.5 Pro
  - Local (via Ollama): Llama, Mistral, Phi, etc. - see local_model_support section
- Thinking effort/reasoning control - For models that support it (like o1, Claude with extended thinking), allow selecting thinking effort levels (low/medium/high or similar)
- Per-conversation model memory - Remember which model was used for each conversation
- Model switching mid-conversation - Allow changing models within a conversation
- Show model metadata: context window size, cost per token, capabilities (vision, function calling, etc.)
  </model_selection>

<file_uploads>

- Drag and drop - Drop files anywhere on the chat to upload
- Click to upload - Button in the input area
- Supported file types:
  - Images (PNG, JPG, GIF, WebP) - Send to vision-capable models
  - PDFs - Extract text or send as images depending on model capability
  - Text files (TXT, MD, JSON, code files) - Include content in context
  - Documents (DOCX, etc.) - Extract and include text
- File preview - Show thumbnails/previews before sending
- File storage - Store in Convex file storage, keep references in conversation
  </file_uploads>

<voice_input>

- Push-to-talk - Hold a button to record
- Voice activity detection - Or auto-detect speech start/stop
- Transcription - Use Whisper API or browser Speech Recognition API
- Visual feedback - Show waveform or recording indicator
- Voice notes in history - Store the original audio alongside the transcription
  </voice_input>

<memory_system>
This is the key differentiator. Build a memory system that:

Memory Extraction:

- Analyze conversations for memorable facts about me:
  - Personal details (name, location, job, interests)
  - Preferences (communication style, formatting preferences)
  - Projects I'm working on
  - People I mention frequently
  - Recurring topics or questions
- Use an LLM to extract these memories automatically after conversations
- Allow manual memory creation/editing

Memory Storage:

- Store memories in Convex with vector embeddings
- Structure: { id, content, embedding, category, source_conversation_id, created_at, updated_at }
- Categories: personal_info, preferences, projects, people, facts, etc.

Memory Retrieval:

- Before generating a response, search memories relevant to the current conversation
- Use vector similarity search on the conversation context
- Inject relevant memories into the system prompt
- Make this configurable (can turn off for specific conversations)

Memory Management UI:

- View all memories
- Edit memory content
- Delete memories
- See which conversation a memory came from
- Manually add memories
  </memory_system>

<projects>
Projects are containers for related conversations that share context:

- Project creation - Name, description, custom system prompt
- Project-specific context - Documents or context that applies to all chats in the project
- Project-level memories - Memories scoped to a project (e.g., project requirements, decisions made)
- Conversation grouping - Conversations belong to a project or are standalone
- Project switching - Easy navigation between projects
- Project settings - Default model, default system prompt additions
  </projects>

<personalization_settings>
Global settings that apply across all conversations:

- Personal context - "About me" section that gets injected into all conversations
- Communication preferences - How I want the AI to respond:
  - Tone (casual, professional, technical)
  - Verbosity (concise vs detailed)
  - Format preferences (use/avoid bullet points, headers, etc.)
- Custom instructions - Free-form instructions always included
- These preferences should be editable and take effect immediately
  </personalization_settings>

<cost_usage_tracking>
Track and visualize all API costs:

Dashboard:

- Total spend: today, this week, this month, all time
- Spend by model (pie chart or bar chart)
- Spend over time (line chart, daily/weekly granularity)
- Cost per conversation (sortable list - find expensive chats)
- Average cost per message by model

Per-message tracking:

- Store token counts (input + output) on every message
- Calculate cost using each model's pricing
- Show cost on hover or in message metadata

Budget features:

- Set monthly budget limit
- Warning at 50%, 80%, 100% thresholds
- Optional hard stop at budget (prevent new messages)
- Email/notification alerts (via PostHog or separate service)

Model cost comparison:

- When selecting a model, show estimated cost for current context
- "This conversation would cost ~$X with GPT-4 vs ~$Y with Claude"
- Help make informed model choices

Data to store per message:

- inputTokens: number
- outputTokens: number
- cost: number (calculated at time of generation using current pricing)

Pricing configuration:

- Store model pricing in config file
- Easy to update when providers change prices
- Support different pricing tiers (e.g., cached vs non-cached tokens)
  </cost_usage_tracking>

<search_all_conversations>
Powerful search across entire conversation history using hybrid search:

Hybrid search approach:

- Full-text search (keyword matching) via Convex's built-in search
- Vector/semantic search (meaning matching) via embeddings
- Combine results with configurable weighting

Search features:

- Global search bar (Cmd+K or dedicated search page)
- Search within current conversation
- Search within current project
- Search across all conversations

Filters:

- Date range (last 7 days, last month, custom range)
- Project (filter to specific project or "no project")
- Model used (find all Claude conversations, etc.)
- Has attachments (find conversations with files)
- Starred/pinned only

Results display:

- Show matching message snippets with highlighted terms
- Group by conversation
- Click to jump directly to that message in context
- Show conversation title, date, project

Implementation:

- Index message content for full-text search
- Generate and store embeddings for semantic search
- Convex supports both - use vector index for semantic, search index for full-text
- Merge and rank results from both approaches

Schema additions:

- Add search index on messages.content
- Add vector index on message embeddings (generate embeddings for all messages)
  </search_all_conversations>

<export_import>
Full data portability:

Export formats:

- JSON (complete data, machine-readable)
- Markdown (human-readable, one file per conversation)
- HTML (formatted for viewing/printing)

Export scope:

- Single conversation
- All conversations in a project
- All data (full account export)

Export includes:

- All messages with metadata (timestamps, model, tokens, cost)
- Memories
- Projects and their settings
- User preferences and custom instructions
- File attachments (as separate files or base64 in JSON)

Import:

- Import from own export (restore from backup)
- Import from ChatGPT export (parse their JSON format, map to our schema)
- Import from Claude.ai export (if/when available)
- Merge strategy: skip duplicates, or create new conversations

Automated backups:

- Optional: scheduled export to cloud storage (S3, Google Drive, Dropbox)
- Or simple: button to download full backup anytime
- Show last backup date, remind if it's been too long

ChatGPT import specifically:

- Parse conversations.json from ChatGPT export
- Map their message format to ours
- Preserve timestamps
- Mark imported conversations clearly
- This is key for migrating your existing ChatGPT history
  </export_import>

<keyboard_shortcuts>
Comprehensive keyboard navigation and command palette:

Command Palette (Cmd+K):

- Fuzzy search across all actions
- Recent commands
- Quick access to everything without mouse

Global shortcuts:

- Cmd+K - Open command palette
- Cmd+N - New conversation
- Cmd+Shift+N - New conversation in current project
- Cmd+/ - Toggle sidebar
- Cmd+, - Open settings
- Cmd+F - Search in current conversation
- Cmd+Shift+F - Global search across all conversations
- Cmd+P - Quick switch conversation (fuzzy finder)
- Cmd+1-9 - Switch to pinned conversations

Chat shortcuts:

- Enter - Send message (configurable)
- Cmd+Enter - Send message (alternative)
- Shift+Enter - New line
- Escape - Cancel current generation / close modals
- Up arrow (in empty input) - Edit last message
- Cmd+Shift+C - Copy last response
- Cmd+Shift+R - Regenerate last response

Navigation:

- J/K - Navigate between messages (vim-style)
- G then H - Go home
- G then S - Go to settings
- G then M - Go to memories
- G then P - Go to projects

Model switching:

- Cmd+M - Open model selector
- Cmd+1-9 in model selector - Quick select model

Customization:

- Settings page to customize all shortcuts
- Vim mode toggle for navigation
- Display shortcut hints in UI (tooltips, command palette)

Implementation:

- Use a library like @tanstack/react-virtual for command palette
- Global keyboard event listener
- Show keyboard shortcut hints throughout UI
- Shortcut cheatsheet modal (Cmd+?)
  </keyboard_shortcuts>

<context_window_visibility>
Show context usage and manage it intelligently:

Display:

- Visual indicator showing % of context window used
- Absolute numbers: "32,456 / 128,000 tokens"
- Color coding: green (plenty of room), yellow (getting full), red (near limit)
- Show in conversation header or near input

Per-model awareness:

- Different models have different context limits
- Update display when switching models
- Warn if switching to a model with smaller context than current usage

Breakdown:

- System prompt tokens
- Memory injection tokens
- Conversation history tokens
- Current input tokens
- Estimated response tokens (based on model averages)

Smart truncation strategies:

- Option 1: Drop oldest messages (simple)
- Option 2: Summarize old messages (use LLM to compress)
- Option 3: Sliding window with summary prefix
- Let user choose strategy in settings
- Show what will be truncated before it happens

Warnings:

- "Context 80% full - older messages may be dropped"
- "This conversation is too long for [model], consider summarizing or switching to [larger model]"

Manual controls:

- Button to manually summarize/compress conversation
- Select messages to exclude from context (but keep in history)
- "Reset context" - start fresh but keep conversation visible
  </context_window_visibility>

<conversation_branching>
Keep conversation history as a tree, not a linear thread:

When editing and regenerating:

- Don't delete the old branch
- Create a new branch from the edit point
- Both branches are preserved and navigable

Branch visualization:

- Show branch indicator on messages that have variants
- Click to see/switch between branches
- Tree view option to see full conversation structure
- Timeline/graph view for complex branched conversations

Use cases:

- Edit a prompt and compare different responses
- Try the same question with different models (each is a branch)
- Explore different directions without losing previous work

Implementation:

- Messages have optional parentMessageId instead of just conversationId
- Or: messages have branchId, branches belong to conversation
- UI shows current branch, allows switching

Schema approach:

```typescript
messages: defineTable({
  // ... existing fields
  parentMessageId: v.optional(v.id("messages")), // For branching
  branchLabel: v.optional(v.string()), // User-defined label like "Claude version" or "shorter prompt"
});
```

Branch management:

- Name/label branches ("GPT-4 attempt", "shorter prompt", etc.)
- Delete branches you don't want
- Merge branches (combine best parts? complex feature, maybe v2)
- Set "main" branch for default view
  </conversation_branching>

<local_model_support>
Support local LLMs via Ollama for free/private usage:

Ollama integration:

- Detect if Ollama is running locally
- List available local models
- Show local models alongside cloud models in picker
- Mark clearly which are local vs cloud

Configuration:

- Ollama API URL (default: http://localhost:11434)
- Test connection button
- Auto-detect available models

Use cases:

- Free unlimited usage for experimentation
- Privacy-sensitive queries (nothing leaves your machine)
- Offline usage
- Testing/comparing open source models

Models to support (whatever Ollama has):

- Llama 3.x
- Mistral/Mixtral
- CodeLlama
- Phi
- Gemma
- Any model user has pulled in Ollama

UX considerations:

- Show "Local" badge on local models
- Show performance warning (local may be slower)
- Show "Free" indicator (no cost tracking needed)
- Graceful handling when Ollama isn't running

Vercel AI SDK:

- Has Ollama provider, so integration should be straightforward
- Same streaming interface as cloud models
  </local_model_support>

<system_prompt_templates>
Save and quickly switch between different system prompts:

Template structure:

- Name (e.g., "Coding Assistant", "Writing Editor", "Research Mode")
- System prompt text
- Optional: recommended model
- Optional: recommended temperature/settings

Management:

- CRUD for templates
- Duplicate existing template
- Import/export templates (share with others)

Usage:

- Quick switcher (dropdown or command palette)
- Apply template to new conversation
- Apply template to existing conversation (updates system prompt)
- Templates are separate from projects (lighter weight)

Built-in starter templates:

- Default (minimal or none)
- Coding Assistant (technical, precise, shows reasoning)
- Writing Editor (focuses on prose quality, suggestions)
- Research Mode (thorough, cites sources, considers alternatives)
- Brainstorm Mode (creative, generative, no criticism)
- Socratic Mode (asks questions, helps you think)

Project + Template interaction:

- Projects can have a default template
- Or project system prompt can combine with template
- Clear precedence: template base + project additions + user custom instructions
  </system_prompt_templates>

<pinning_favorites>
Organize important conversations:

Pinning:

- Pin conversations to top of sidebar
- Pinned conversations always visible (don't scroll away)
- Reorder pinned conversations (drag and drop)
- Pin limit? (maybe top 10 or unlimited)
- Pin icon/indicator in conversation list

Favorites/Stars:

- Star conversations for quick filtering
- Starred != pinned (starred is a filter, pinned is position)
- Filter sidebar to show only starred
- Stars carry over to search results (boost starred in results?)

Folders/Tags (optional, if you want more organization):

- Tag conversations with custom labels
- Filter by tag
- Conversations can have multiple tags
- Simpler than nested folders

Quick access:

- Cmd+1-9 to jump to pinned conversations
- Recent conversations list in command palette
- "Jump to conversation" fuzzy finder
  </pinning_favorites>

<message_bookmarking>
Save and annotate specific messages:

Bookmarking:

- Bookmark any message (user or assistant)
- Bookmarks are cross-conversation (global collection)
- View all bookmarks in dedicated page
- Bookmarks show which conversation they're from (click to jump there)

Use cases:

- "This explanation was really good, save it"
- Collect code snippets across conversations
- Build a personal knowledge base from AI responses

Annotations:

- Add personal notes to any message
- Notes are private (not sent to AI)
- "Why I bookmarked this", "Use this for X project", etc.

Highlights:

- Highlight specific text within a message
- Multiple highlights per message
- Highlight colors (optional)

Organization:

- Tag/categorize bookmarks
- Search within bookmarks
- Sort by date added, date of message, conversation

Schema:

```typescript
bookmarks: defineTable({
  userId: v.id("users"),
  messageId: v.id("messages"),
  note: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  highlightedText: v.optional(v.string()), // Specific highlighted portion
  createdAt: v.number(),
});
```

</message_bookmarking>

<image_generation>
Generate images via Google Imagen:

Integration:

- Google Imagen API (via Vertex AI or Google AI Studio)
- Trigger: explicit command or detected intent ("generate an image of...")
- Or: dedicated "Generate Image" button/mode

Features:

- Text-to-image generation
- Show generation progress/status
- Display generated image inline in conversation
- Download image
- Regenerate with same prompt
- Edit prompt and regenerate

Image storage:

- Store generated images in Convex file storage
- Link to message that generated them
- Include in exports

Cost tracking:

- Imagen has per-image pricing
- Track and display cost
- Count toward usage dashboard

UX:

- Preview prompt before generating (confirm cost)
- Image appears in chat like a message
- Click to view full size
- Save to device
  </image_generation>

<text_to_speech>
Have AI responses read aloud:

Implementation options:

- Browser native: Web Speech API (free, works offline)
- Cloud: Google Cloud TTS, ElevenLabs, OpenAI TTS (better quality)
- Let user choose in settings

Features:

- Play button on each assistant message
- Read entire message
- Play/pause/stop controls
- Speed control (0.5x to 2x)
- Voice selection (if multiple available)

UX:

- Audio indicator while playing
- Highlight text as it's being read (optional, complex)
- Keyboard shortcut to read last response
- Auto-read new responses (optional setting)

Settings:

- Enable/disable TTS
- Default voice
- Default speed
- Auto-read toggle
- TTS provider selection (browser vs cloud)
  </text_to_speech>

<shareable_conversations>
Generate links to share conversations:

Share types:

- Public link (anyone with link can view)
- Private link (requires auth, only specific users)
- Password-protected link
- Expiring link (auto-delete after X days)

What's shared:

- Full conversation or selected portion
- Option to anonymize (remove personal info from memories/context)
- Include or exclude system prompt
- Snapshot at time of share (doesn't update if conversation continues)

Implementation:

- Generate unique share ID
- Create read-only view page: /share/[shareId]
- Store share metadata: conversationId, created, expires, accessType

Viewer experience:

- Clean, read-only view of conversation
- No sidebar, no input
- "Shared from blah.chat" branding
- Option for viewer to "fork" into their own conversation (if logged in)

Management:

- See all active shares
- Revoke shares
- See view count
- Edit share settings (extend expiry, change access)

Schema:

```typescript
shares: defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  shareId: v.string(), // URL-safe unique ID
  accessType: v.union(
    v.literal("public"),
    v.literal("password"),
    v.literal("private"),
  ),
  password: v.optional(v.string()), // Hashed
  expiresAt: v.optional(v.number()),
  messageRange: v.optional(
    v.object({
      // Share subset
      startMessageId: v.id("messages"),
      endMessageId: v.id("messages"),
    }),
  ),
  viewCount: v.number(),
  createdAt: v.number(),
});
```

</shareable_conversations>

<response_comparison>
Send same prompt to multiple models and compare:

Trigger:

- "Compare" button next to send
- Select 2-4 models to compare
- All generate simultaneously (or sequentially if rate limited)

Display:

- Side-by-side columns (2-up or 3-up)
- Synced scrolling
- Each response shows its model, token count, cost, latency

After comparison:

- Pick winner to "keep" as the canonical response
- Or keep all as branches
- Note: comparison messages count toward cost

Quick compare:

- On any existing response: "Compare with [other model]"
- Generates new response with same prompt, shows side-by-side
- This is different from branching - it's explicit comparison mode

Analytics:

- Track which model you choose most often in comparisons
- Feed into model recommendations ("you usually prefer Claude for coding")

Implementation:

- Parallel API calls with Promise.all (respect rate limits)
- Store as multiple messages with same parentId or comparison group ID
- Special UI component for comparison view
  </response_comparison>

<retry_different_model>
Quick action to retry with another model:

On any assistant message:

- "Retry with..." dropdown showing other models
- One-click to regenerate same prompt with different model
- Creates a branch (doesn't delete original)

Quick actions:

- Show 2-3 most-used alternative models
- "More models..." opens full selector
- Keyboard shortcut: Cmd+Shift+M on a message

Result:

- New response appears as a branch
- Easy toggle between versions
- Shows model name clearly on each version

Smart suggestions:

- If response was slow, suggest faster model
- If response was expensive, suggest cheaper model
- If response was truncated, suggest larger context model
  </retry_different_model>

<scheduled_prompts>
Automate recurring prompts:

Schedule types:

- One-time (schedule for future)
- Recurring (daily, weekly, monthly, cron)

Configuration:

- Prompt text
- Model to use
- Project/conversation context
- Schedule (cron expression or simple picker)
- Enable/disable toggle

Use cases:

- "Every Monday: Summarize my project memories"
- "Daily at 9am: What should I focus on today based on my recent conversations?"
- "Weekly: Generate a summary of all conversations this week"
- "Monthly: Analyze my usage patterns and suggest optimizations"

Implementation options:

- Convex scheduled functions (built-in cron support)
- External scheduler (Inngest, Trigger.dev) for more complex needs
- Simple: Convex cron jobs that trigger actions

Results:

- Scheduled prompt creates new conversation (or adds to designated conversation)
- Notification when scheduled prompt completes
- View history of scheduled prompt runs

Management UI:

- List all scheduled prompts
- Enable/disable individual schedules
- See last run, next run
- View results/history

Schema:

```typescript
scheduledPrompts: defineTable({
  userId: v.id("users"),
  name: v.string(),
  prompt: v.string(),
  model: v.string(),
  projectId: v.optional(v.id("projects")),
  targetConversationId: v.optional(v.id("conversations")), // Or create new each time
  schedule: v.string(), // Cron expression
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  nextRunAt: v.optional(v.number()),
  createdAt: v.number(),
});
```

</scheduled_prompts>
</features>

<api_envelope_pattern>
Implement consistent response envelopes across all API endpoints. Never return raw data - wrap everything in standard structure.

Response Structure:
Shape all responses with envelope containing metadata + payload:

Success (single): { status: "success", sys: { id?, entity, timestamps? }, data: T }
Success (list): { status: "success", sys: { entity: "list" }, data: Entity<T>[] }
Error: { status: "error", sys: { entity: "error" }, error: string | { message, code?, context? } }

entity discriminator identifies resource type ("user", "post", "comment", etc). Use consistent naming across project.

Backend Implementation:
Create formatter utilities (suggest src/lib/utils/formatEntity.ts):

```typescript
export function formatEntity<T>(data: T, entity: string) {
  return {
    status: "success",
    sys: { id: data?.id, entity },
    data,
  };
}

export function formatEntityList<T>(items: T[], entity: string) {
  return {
    status: "success",
    sys: { entity: "list" },
    data: items.map((item) => formatEntity(item, entity)),
  };
}

export function formatErrorEntity(error: string | object) {
  return {
    status: "error",
    sys: { entity: "error" },
    error,
  };
}
```

Use in routes:

```typescript
// Success
return res.json(formatEntity(user, "user"));

// List
return res.json(formatEntityList(posts, "post"));

// Error (match HTTP status)
return res.status(404).json(formatErrorEntity("Not found"));

// Structured error
return res.status(400).json(
  formatErrorEntity({
    message: "Validation failed",
    code: "VALIDATION_ERROR",
    context: { field: "email", issue: "invalid format" },
  }),
);
```

Frontend Unwrapping:
Always extract .data from envelope:

```typescript
// React Query
const { data } = useQuery({
  queryFn: async () => {
    const res = await fetch("/api/users");
    if (!res.ok) {
      const envelope = await res.json();
      const msg =
        typeof envelope.error === "string"
          ? envelope.error
          : envelope.error?.message || "Request failed";
      throw new Error(msg);
    }
    return res.json();
  },
});

const users = data?.data; // Unwrap payload
const userId = data?.sys?.id; // Access metadata
```

Critical Rules:

ALWAYS:

- Wrap every response with format functions - no raw data returns
- Include HTTP status matching envelope status (404 error needs status: 404)
- Unwrap .data on frontend - never use envelope directly as data
- Use consistent entity type strings across routes for same resource

NEVER:

- Return res.json(rawData) - must use formatter
- Mix patterns - all endpoints use envelope, no exceptions
- Access response.id on frontend - use response.sys.id (metadata) + response.data (payload)
- Skip error envelope - even simple errors get wrapped

Why This Pattern:
Benefits: Consistent parsing across all endpoints. Metadata separate from data. Structured errors with context. Type-safe contracts. Easy debugging.

Trade-offs: Extra bytes per response (~50-100). Redundant with HTTP status codes. Frontend must always unwrap.

Choose envelope pattern for JS-heavy apps prioritizing consistency + structured errors over HTTP purity. Skip if building strict REST API where HTTP semantics sufficient.

Common Mistakes:
❌ return res.json(user) → ✓ return res.json(formatEntity(user, "user"))
❌ const name = data.name → ✓ const name = data?.data?.name
❌ throw new Error("Failed") → ✓ Extract from envelope.error before throwing
❌ Different shapes per route → ✓ All routes use identical envelope structure
</api_envelope_pattern>

<api_endpoints>
Use Next.js API routes (Route Handlers) for backend logic. Structure routes logically:

Core Chat:
/api/chat - POST (streaming chat completion)
/api/chat/compare - POST (multi-model comparison, parallel requests)

Conversations:
/api/conversations - GET (list), POST (create)
/api/conversations/[id] - GET, PATCH, DELETE
/api/conversations/[id]/branch - POST (create branch from message)
/api/conversations/[id]/export - GET (export single conversation)

Messages:
/api/messages/[id] - GET, PATCH, DELETE
/api/messages/[id]/retry - POST (retry with different model)
/api/messages/[id]/bookmark - POST, DELETE

Projects:
/api/projects - GET, POST
/api/projects/[id] - GET, PATCH, DELETE

Memories:
/api/memories - GET (with search), POST
/api/memories/[id] - GET, PATCH, DELETE
/api/memories/extract - POST (extract from conversation)

Search:
/api/search - GET (global hybrid search across conversations)
/api/search/conversations - GET (search conversation titles)
/api/search/messages - GET (search message content)

Templates:
/api/templates - GET, POST
/api/templates/[id] - GET, PATCH, DELETE

Bookmarks:
/api/bookmarks - GET, POST
/api/bookmarks/[id] - GET, PATCH, DELETE

Shares:
/api/shares - GET (list user's shares), POST (create share)
/api/shares/[shareId] - GET (public view), PATCH, DELETE
/api/shares/[shareId]/verify - POST (verify password for protected shares)

Scheduled Prompts:
/api/scheduled - GET, POST
/api/scheduled/[id] - GET, PATCH, DELETE
/api/scheduled/[id]/run - POST (manual trigger)

Usage & Cost:
/api/usage - GET (usage stats with date range, model filters)
/api/usage/daily - GET (daily breakdown)
/api/usage/by-model - GET (cost per model)
/api/usage/by-conversation - GET (cost per conversation)

Export/Import:
/api/export - POST (full account export)
/api/export/project/[id] - GET (export project)
/api/import - POST (import from file)
/api/import/chatgpt - POST (ChatGPT-specific import)

Media:
/api/upload - POST (file upload)
/api/images/generate - POST (Imagen generation)
/api/tts - POST (text-to-speech generation)

Integrations:
/api/ollama/status - GET (check Ollama connection)
/api/ollama/models - GET (list local models)

Settings:
/api/settings - GET, PATCH (user preferences)
/api/settings/shortcuts - GET, PATCH (keyboard shortcuts)

Webhooks:
/api/webhooks/clerk - POST (Clerk user sync)

Use Pino for all logging in API routes. Log:

- Request method, path, duration
- Errors with full context
- LLM calls (model, token counts, latency, cost)
- Rate limit hits
  </api_endpoints>

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

Focus on:

- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:

- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!

Additional Design Direction:

- The name "blah.chat" is playful and casual - the design can lean into this personality
- Consider dark theme as primary (I prefer dark)
- Draw inspiration from code editor themes (Vesper, Rosé Pine, Catppuccin, Tokyo Night, Ayu) or unique web apps
- The input area should feel prominent and inviting
- Empty states should be delightful, not boring
- Sidebar + main content is fine, but make it feel fresh
- Consider the spacing, proportions, and visual hierarchy carefully
  </frontend_aesthetics>

<project_structure>

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (main)/
│   │   ├── layout.tsx (authenticated layout with sidebar)
│   │   ├── page.tsx (redirect to new chat or last conversation)
│   │   ├── chat/
│   │   │   ├── page.tsx (new chat)
│   │   │   ├── [conversationId]/page.tsx (existing chat)
│   │   │   └── compare/page.tsx (comparison mode)
│   │   ├── projects/
│   │   │   ├── page.tsx (project list)
│   │   │   └── [projectId]/page.tsx (project detail)
│   │   ├── memories/
│   │   │   └── page.tsx (memory management)
│   │   ├── bookmarks/
│   │   │   └── page.tsx (saved messages & highlights)
│   │   ├── search/
│   │   │   └── page.tsx (global search)
│   │   ├── usage/
│   │   │   └── page.tsx (cost & usage dashboard)
│   │   ├── templates/
│   │   │   └── page.tsx (system prompt templates)
│   │   ├── scheduled/
│   │   │   └── page.tsx (scheduled prompts management)
│   │   ├── settings/
│   │   │   ├── page.tsx (general settings)
│   │   │   ├── shortcuts/page.tsx (keyboard shortcuts)
│   │   │   ├── export/page.tsx (export & import)
│   │   │   └── models/page.tsx (model config, Ollama setup)
│   │   └── shares/
│   │       └── page.tsx (manage shared conversations)
│   ├── share/
│   │   └── [shareId]/page.tsx (public shared conversation view)
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts (streaming chat endpoint)
│   │   │   └── compare/route.ts (multi-model comparison)
│   │   ├── conversations/
│   │   ├── projects/
│   │   ├── memories/
│   │   ├── bookmarks/
│   │   ├── templates/
│   │   ├── shares/
│   │   ├── scheduled/
│   │   ├── usage/
│   │   ├── export/
│   │   ├── import/
│   │   ├── images/
│   │   │   └── generate/route.ts (Imagen generation)
│   │   ├── tts/
│   │   │   └── route.ts (text-to-speech)
│   │   ├── ollama/
│   │   │   └── route.ts (Ollama proxy/status)
│   │   └── webhooks/
│   │       └── clerk/route.ts (Clerk webhook handler)
│   ├── layout.tsx (root layout, providers)
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── MessageActions.tsx (copy, bookmark, retry, branch)
│   │   ├── ChatInput.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── ThinkingEffortSelector.tsx
│   │   ├── ContextWindowIndicator.tsx
│   │   ├── BranchIndicator.tsx
│   │   ├── BranchSwitcher.tsx
│   │   ├── ComparisonView.tsx
│   │   ├── StreamingMessage.tsx
│   │   ├── VoiceInput.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ImagePreview.tsx
│   │   └── TTSControls.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ConversationList.tsx
│   │   ├── PinnedConversations.tsx
│   │   ├── ProjectSwitcher.tsx
│   │   └── SearchBar.tsx
│   ├── memories/
│   ├── bookmarks/
│   │   ├── BookmarkList.tsx
│   │   ├── BookmarkItem.tsx
│   │   └── AddBookmarkDialog.tsx
│   ├── projects/
│   ├── templates/
│   │   ├── TemplateList.tsx
│   │   ├── TemplateEditor.tsx
│   │   └── TemplatePicker.tsx
│   ├── usage/
│   │   ├── UsageDashboard.tsx
│   │   ├── CostChart.tsx
│   │   ├── ModelBreakdown.tsx
│   │   └── BudgetAlert.tsx
│   ├── search/
│   │   ├── GlobalSearch.tsx
│   │   ├── SearchResults.tsx
│   │   └── SearchFilters.tsx
│   ├── shares/
│   │   ├── ShareDialog.tsx
│   │   ├── ShareManager.tsx
│   │   └── SharedConversationView.tsx
│   ├── scheduled/
│   │   ├── ScheduledPromptList.tsx
│   │   ├── ScheduledPromptEditor.tsx
│   │   └── CronPicker.tsx
│   ├── export-import/
│   │   ├── ExportDialog.tsx
│   │   ├── ImportDialog.tsx
│   │   └── ChatGPTImporter.tsx
│   ├── command-palette/
│   │   └── CommandPalette.tsx
│   └── common/
│       ├── KeyboardShortcuts.tsx (global listener)
│       └── ShortcutHint.tsx
├── lib/
│   ├── utils/
│   │   ├── formatEntity.ts
│   │   ├── cost.ts (pricing calculations)
│   │   ├── tokens.ts (token counting utilities)
│   │   └── search.ts (hybrid search merging)
│   ├── ai/
│   │   ├── models.ts (model definitions, capabilities, pricing)
│   │   ├── providers.ts (Vercel AI SDK provider setup)
│   │   ├── ollama.ts (Ollama client setup)
│   │   ├── memory.ts (memory extraction, injection logic)
│   │   ├── embeddings.ts (embedding generation)
│   │   └── imagen.ts (Google Imagen client)
│   ├── tts/
│   │   ├── browser.ts (Web Speech API)
│   │   └── cloud.ts (Cloud TTS providers)
│   ├── export/
│   │   ├── json.ts
│   │   ├── markdown.ts
│   │   └── html.ts
│   ├── import/
│   │   ├── chatgpt.ts (ChatGPT export parser)
│   │   └── native.ts (own format importer)
│   ├── logger.ts (Pino setup)
│   └── shortcuts.ts (keyboard shortcut definitions)
├── convex/
│   ├── schema.ts
│   ├── conversations.ts
│   ├── messages.ts
│   ├── memories.ts
│   ├── projects.ts
│   ├── users.ts
│   ├── bookmarks.ts
│   ├── templates.ts
│   ├── shares.ts
│   ├── scheduled.ts
│   ├── usage.ts
│   ├── search.ts (hybrid search queries)
│   ├── crons.ts (scheduled prompt execution)
│   └── http.ts (HTTP routes for webhooks)
├── hooks/
│   ├── useChat.ts
│   ├── useConversations.ts
│   ├── useMemories.ts
│   ├── useBookmarks.ts
│   ├── useSearch.ts
│   ├── useUsage.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useCommandPalette.ts
│   ├── useTTS.ts
│   ├── useContextWindow.ts
│   └── useBranching.ts
└── types/
    ├── chat.ts
    ├── models.ts
    ├── usage.ts
    └── ...
```

</project_structure>

<convex_schema>
Design the Convex schema to support all features:

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
    personalContext: v.optional(v.string()), // "About me"
    communicationPreferences: v.optional(
      v.object({
        tone: v.optional(v.string()),
        verbosity: v.optional(v.string()),
        formatPreferences: v.optional(v.string()),
      }),
    ),
    customInstructions: v.optional(v.string()),
    // Budget settings
    monthlyBudget: v.optional(v.number()),
    budgetAlertThresholds: v.optional(v.array(v.number())), // e.g., [0.5, 0.8, 1.0]
    // TTS settings
    ttsEnabled: v.optional(v.boolean()),
    ttsVoice: v.optional(v.string()),
    ttsSpeed: v.optional(v.number()),
    ttsProvider: v.optional(v.string()),
    ttsAutoRead: v.optional(v.boolean()),
    // Ollama settings
    ollamaEnabled: v.optional(v.boolean()),
    ollamaUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    defaultTemplateId: v.optional(v.id("systemPromptTemplates")),
    archived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  conversations: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    title: v.optional(v.string()),
    model: v.string(), // Last used model
    archived: v.boolean(),
    // Pinning & favorites
    pinned: v.optional(v.boolean()),
    pinnedOrder: v.optional(v.number()), // For ordering pinned conversations
    starred: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_user_pinned", ["userId", "pinned"])
    .index("by_user_starred", ["userId", "starred"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),
    model: v.optional(v.string()), // Model used for this response
    thinkingContent: v.optional(v.string()), // For extended thinking
    attachments: v.optional(
      v.array(
        v.object({
          type: v.string(),
          url: v.string(),
          name: v.string(),
          mimeType: v.string(),
        }),
      ),
    ),
    // Resilient generation fields
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
    ),
    partialContent: v.optional(v.string()),
    error: v.optional(v.string()),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),
    // Cost tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()), // In USD
    // Branching
    parentMessageId: v.optional(v.id("messages")),
    branchLabel: v.optional(v.string()),
    isMainBranch: v.optional(v.boolean()),
    // Comparison mode
    comparisonGroupId: v.optional(v.string()), // Group parallel responses
    // Search embedding
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_parent", ["parentMessageId"])
    .index("by_comparison_group", ["comparisonGroupId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["conversationId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["conversationId"],
    }),

  memories: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    category: v.string(),
    sourceConversationId: v.optional(v.id("conversations")),
    embedding: v.array(v.float64()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "projectId"],
    }),

  files: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    // For generated images
    generatedByModel: v.optional(v.string()),
    generationPrompt: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  // System prompt templates
  systemPromptTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(), // The actual system prompt
    recommendedModel: v.optional(v.string()),
    recommendedTemperature: v.optional(v.number()),
    isBuiltIn: v.optional(v.boolean()), // For starter templates
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Bookmarks
  bookmarks: defineTable({
    userId: v.id("users"),
    messageId: v.id("messages"),
    note: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    highlightedText: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["messageId"]),

  // Shareable conversations
  shares: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    shareId: v.string(), // URL-safe unique ID
    accessType: v.union(
      v.literal("public"),
      v.literal("password"),
      v.literal("private"),
    ),
    passwordHash: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    messageRange: v.optional(
      v.object({
        startMessageId: v.id("messages"),
        endMessageId: v.id("messages"),
      }),
    ),
    includeSystemPrompt: v.optional(v.boolean()),
    anonymized: v.optional(v.boolean()),
    viewCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_share_id", ["shareId"])
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  // Scheduled prompts
  scheduledPrompts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    prompt: v.string(),
    model: v.string(),
    projectId: v.optional(v.id("projects")),
    targetConversationId: v.optional(v.id("conversations")),
    schedule: v.string(), // Cron expression
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    lastRunConversationId: v.optional(v.id("conversations")),
    lastRunError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_enabled", ["enabled"]),

  // Usage/cost tracking (daily aggregates)
  usageRecords: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    messageCount: v.number(),
    imageGenerations: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_model", ["userId", "model"]),

  // Keyboard shortcuts customization
  keyboardShortcuts: defineTable({
    userId: v.id("users"),
    shortcuts: v.array(
      v.object({
        action: v.string(),
        keys: v.string(), // e.g., "cmd+k", "ctrl+shift+f"
        enabled: v.boolean(),
      }),
    ),
    vimModeEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

</convex_schema>

<implementation_notes>
<clerk_convex_integration>

- Use Clerk's webhook to sync user creation to Convex
- Store Clerk user ID in Convex users table
- Use Clerk's useUser hook for client-side user info
- Protect Convex functions with user authentication
  </clerk_convex_integration>

<posthog_integration>

- Initialize PostHog in root layout
- Track key events:
  - conversation_started
  - message_sent (with model, token count)
  - model_switched
  - memory_created
  - file_uploaded
  - voice_input_used
- Set up user identification with Clerk user ID
- Consider session recording for debugging UX issues
  </posthog_integration>

<streaming_implementation>

- Use Vercel AI SDK's streamText for streaming responses
- Convex doesn't support streaming directly, so:
  - Stream response via API route
  - Save complete message to Convex when stream finishes
  - Use optimistic updates to show message immediately
    </streaming_implementation>

<resilient_generation>
CRITICAL: Message generation must survive page refresh, tab close, or navigation away.

The Problem:
If I send a message and then refresh the page or close the tab while the AI is responding, I should NOT lose that response. When I return, the completed (or partial) response should be there waiting for me.

Architecture Approach:

1. Decouple generation from the client connection:
   - When user sends a message, immediately create a "pending" message record in Convex with status: "generating"
   - Kick off the LLM generation in a Convex action (or a separate serverless function / background job)
   - The generation process runs server-side, independent of the client connection
   - When complete, update the message record with the full content and status: "complete"

2. Message states:
   - "pending" - User message saved, AI response not yet started
   - "generating" - AI is actively generating (store partial content if possible)
   - "complete" - Generation finished successfully
   - "error" - Generation failed (store error details)

3. Client behavior:
   - On page load, check for any messages with status "generating" for the current conversation
   - If found, show a loading state and subscribe to updates (Convex reactivity handles this automatically)
   - When the message transitions to "complete", display it normally
   - For active streaming: show real-time tokens via a separate channel (SSE/websocket), but the source of truth is always the database

4. Partial content preservation:
   - Periodically save partial content during generation (every few seconds or every N tokens)
   - If generation crashes, user at least sees what was generated so far
   - Store partial content in the message record: partialContent field
   - On recovery, can either show partial + continue, or restart generation

5. Implementation options:

   Option A - Convex Actions (Recommended for this stack):
   - Convex actions can run for up to 10 minutes
   - Start action, it calls LLM API and streams internally
   - Periodically mutate the message record with new content
   - Client subscribes to the message via Convex query - gets automatic updates
   - Even if client disconnects, action completes and saves

   Option B - External background job:
   - Use a job queue (Inngest, Trigger.dev, QStash, or similar)
   - HTTP endpoint receives message, enqueues job, returns immediately
   - Job worker calls LLM, updates database
   - More resilient for very long generations, but adds complexity

   Option C - Hybrid streaming:
   - Stream to client for real-time UX when connected
   - Simultaneously buffer on server
   - If client disconnects, server continues and saves
   - When client reconnects, fetch from database

6. Schema additions:

   ```typescript
   messages: defineTable({
     // ... existing fields
     status: v.union(
       v.literal("pending"),
       v.literal("generating"),
       v.literal("complete"),
       v.literal("error"),
     ),
     partialContent: v.optional(v.string()), // Content generated so far
     error: v.optional(v.string()), // Error message if failed
     generationStartedAt: v.optional(v.number()),
     generationCompletedAt: v.optional(v.number()),
   });
   ```

7. UI considerations:
   - Show clear indicator when returning to a conversation with in-progress generation
   - "Continuing generation..." or similar message
   - Allow user to cancel a stuck generation
   - Show time elapsed if generation is taking long
   - Handle edge case: user sends another message while previous is still generating

This is non-negotiable. I will absolutely refresh pages or close tabs mid-generation, and I cannot lose responses.
</resilient_generation>

<ai_component_library_decision>
### AI Component Library Decision

**Evaluated**: Vercel AI Elements
**Decision**: Design inspiration only

**Rationale**:
- AI Elements: client-side streaming (useChat + API routes)
- Resilient generation: server-side actions + DB persistence
- Client state lost on refresh (fails core requirement)

**Trade-offs**:
- Manual: 52-72 lines/component, custom maintenance
- AI Elements: pre-built but incompatible with Convex
- Decision: manual necessary for refresh resilience

**Reference for**:
- Toolbar UX patterns
- Loading animations
- Input features
</ai_component_library_decision>

<memory_system_flow>

1. User sends message
2. Search memories relevant to conversation context (vector search)
3. Inject relevant memories into system prompt
4. Generate response
5. After conversation ends (or periodically), extract new memories
6. Store memories with embeddings
   </memory_system_flow>

<error_handling>

- Use error boundaries for React components
- Show user-friendly error messages in the UI
- Log detailed errors with Pino
- Handle API rate limits gracefully (queue, retry)
  </error_handling>
  </implementation_notes>

<getting_started>
Build in phases. Each phase should be complete and working before moving to the next.

Phase 1 - Foundation:

1. Set up Next.js project with TypeScript
2. Install and configure Convex with full schema
3. Set up Clerk authentication
4. Install shadcn/ui with custom theme (make it distinctive!)
5. Set up Tailwind with custom design tokens
6. Create the basic layout (sidebar + main area)
7. Implement keyboard shortcuts infrastructure and command palette

Phase 2 - Core Chat: 8. Implement conversation CRUD (create, list, rename, delete, archive) 9. Add basic chat functionality with one model (OpenAI) 10. Implement resilient generation (survives refresh) 11. Add streaming with partial content saves 12. Add context window visibility indicator

Phase 3 - Multi-Model: 13. Add model switching (all OpenAI, Anthropic, Google models) 14. Add thinking effort selector for reasoning models 15. Implement Ollama/local model support 16. Add retry with different model action 17. Add response comparison mode

Phase 4 - Rich Input: 18. Implement file uploads (images, PDFs, documents) 19. Add voice input with transcription 20. Add drag-and-drop support

Phase 5 - Memory System: 21. Build memory extraction (analyze conversations, extract facts) 22. Implement vector storage and search for memories 23. Add memory injection into prompts 24. Create memory management UI 25. Add global search (hybrid: full-text + semantic)

Phase 6 - Organization: 26. Implement projects with scoped context 27. Add system prompt templates 28. Add conversation pinning and favorites 29. Add message bookmarking and highlights 30. Add tags for conversations

Phase 7 - Output Features: 31. Add text-to-speech for responses 32. Add image generation (Google Imagen) 33. Implement conversation branching UI 34. Add copy, edit, regenerate message actions

Phase 8 - Sharing & Export: 35. Implement shareable conversation links 36. Build export (JSON, Markdown, HTML) 37. Build import (own format + ChatGPT) 38. Add conversation backup system

Phase 9 - Analytics & Automation: 39. Implement cost tracking per message 40. Build usage dashboard with charts 41. Add budget alerts 42. Implement scheduled/recurring prompts

Phase 10 - Polish: 43. Add PostHog analytics events 44. Polish all animations and transitions 45. Audit keyboard navigation 46. Responsive/mobile optimization 47. Error boundaries and user-friendly error messages 48. Performance optimization (virtualized lists, lazy loading)

Test each feature thoroughly before moving on. The app should be usable after Phase 2.
</getting_started>

<environment_variables>

```
# App
NEXT_PUBLIC_APP_URL=https://blah.chat
NEXT_PUBLIC_APP_NAME=blah.chat

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Image Generation (Google Imagen via Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS= # Path to service account JSON

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Embeddings (if using separate from chat models)
EMBEDDING_API_KEY=
EMBEDDING_MODEL= # e.g., text-embedding-3-small

# Text-to-Speech (optional cloud providers)
ELEVENLABS_API_KEY=
OPENAI_TTS_API_KEY= # Can reuse OPENAI_API_KEY

# Ollama (optional, defaults shown)
OLLAMA_BASE_URL=http://localhost:11434

# Model pricing config (or store in code)
MODEL_PRICING_CONFIG_URL= # Optional: external pricing config
```

</environment_variables>

<priorities>
This is a personal tool that I'll use daily. Prioritize:

1. Reliability - It needs to work without frustrating bugs
2. Resilient generation - Responses MUST survive page refresh, tab close, or navigation. This is critical.
3. Speed - Fast response times, snappy UI, keyboard-driven navigation
4. Aesthetics - Make it beautiful and unique, something I enjoy looking at
5. The memory system - This is the killer feature that makes it personal
6. Cost visibility - I need to always know what I'm spending
7. Search - After months of use, finding past conversations is essential
8. Data ownership - Export, import, backups. My data, my control.

Take your time to get the design right. I'd rather have a polished MVP with fewer features than a feature-complete app that looks generic.

Build iteratively in phases. Each phase should result in a working, usable app. Don't try to build everything at once.

The app should be genuinely delightful to use - this isn't just a ChatGPT clone, it's a tool built exactly how I want it.
</priorities>
</project>
