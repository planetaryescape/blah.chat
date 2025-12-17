# Privacy Policy

**Effective Date**: December 17, 2025
**Last Updated**: December 17, 2025

This privacy policy applies to **self-hosted instances** of blah.chat. For the cloud version (blah.chat SaaS), see our separate privacy policy at https://blah.chat/privacy (when launched).

---

## Summary

- **Self-hosted**: You control all data. Nothing leaves your infrastructure.
- **Telemetry**: Optional, anonymous, aggregate instance metrics only. Opt-out anytime.
- **No tracking**: No cookies, no analytics, no user behavior tracking in self-hosted instances.
- **AGPL compliance**: If you modify and distribute blah.chat, you must disclose your source per AGPLv3 Section 13.

---

## What Data is Stored (Self-Hosted)

When you run blah.chat on your own infrastructure:

### Your Convex Database
- User accounts (name, email from Clerk)
- Conversations and messages (content you create)
- AI model preferences
- Memory extractions (facts from your conversations)
- Cost tracking (token usage, spending)
- Projects, bookmarks, scheduled prompts

**You control**: Database location, backups, retention, access.

### Your Clerk Account
- User authentication data (managed by Clerk)
- OAuth connections (Google, GitHub, etc. if enabled)

**Controlled by**: Your Clerk account settings.

### File Storage (Convex Storage)
- Message attachments (images, PDFs, audio)
- Generated images (DALL-E, Imagen)
- Voice recordings (transcription input)

**You control**: Storage location, retention policies.

---

## Telemetry (Optional)

Self-hosted instances can send **anonymous usage statistics** to help improve blah.chat.

### What We Collect (If Enabled)

**Instance-level metrics** (NOT user-level):
- **Instance ID**: Random UUID (e.g., `abc123xyz789`)
- **App version**: Which release you're running
- **Daily message count**: Total messages sent (aggregate, no content)
- **Active users count**: How many users interacted last 24h (count only)
- **Features enabled**: Which features you turned on (memory, search, etc.)
- **Error counts**: Number of errors (counts only, no stack traces)
- **OS/platform**: Linux, macOS, Windows, Docker
- **Node.js version**: Runtime version

### What We DON'T Collect

❌ **Never collected**:
- Message content or conversation topics
- User emails, names, or identities
- API keys or credentials
- IP addresses (hashed or not)
- Individual user behavior patterns
- Session recordings or screen captures
- Personal identifiable information (PII)

### How It's Used

**Purpose**: Improve software quality
- Identify popular features (prioritize development)
- Detect common errors (fix bugs faster)
- Understand deployment patterns (Docker vs native)
- Track adoption (how many instances running)

**NOT used for**:
- Advertising or marketing
- Selling to third parties
- User profiling or tracking
- Commercial data products

### Telemetry Infrastructure

- **Service**: PostHog Cloud (https://posthog.com)
- **Data retention**: 90 days, then auto-deleted
- **Data location**: EU or US (configurable in PostHog)
- **Third-party sharing**: None
- **GDPR compliance**: PostHog is GDPR-compliant

### Opt-Out Anytime

**Disable completely**:
```bash
# In .env.local or .env
TELEMETRY_DISABLED=1
```

**Debug mode** (see what would be sent, without sending):
```bash
TELEMETRY_DEBUG=1
```

Check console logs - you'll see exactly what data is collected.

**No penalties**: Disabling telemetry doesn't affect functionality. App works identically.

---

## Third-Party Services (Required)

Self-hosted blah.chat requires these services:

### Convex (Database + Backend)
- **Purpose**: Database, serverless functions, file storage
- **Data**: All conversation data, messages, user preferences
- **Privacy policy**: https://convex.dev/privacy
- **Your control**: Data in your Convex project, you're the controller
- **GDPR**: Convex is GDPR-compliant, SOC 2 certified

### Clerk (Authentication)
- **Purpose**: User sign-in, session management
- **Data**: Email, name, OAuth connections
- **Privacy policy**: https://clerk.com/privacy
- **Your control**: Data in your Clerk app, you manage users
- **GDPR**: Clerk is GDPR-compliant, SOC 2 Type II

### Vercel AI Gateway (AI Model Access)
- **Purpose**: Route requests to OpenAI, Anthropic, Google, etc.
- **Data**: Message content sent to AI models
- **Privacy policy**: https://vercel.com/legal/privacy-policy
- **Your control**: You provide API key, you're billed directly
- **GDPR**: Vercel is GDPR-compliant

### AI Model Providers (OpenAI, Anthropic, Google, etc.)
- **Purpose**: Generate AI responses
- **Data**: Message content, conversation context
- **Privacy policies**:
  - OpenAI: https://openai.com/privacy
  - Anthropic: https://anthropic.com/privacy
  - Google: https://policies.google.com/privacy
- **Data usage**: Per each provider's policy (most don't train on API data)
- **Your control**: Choose which models to enable

### Optional Services

If you enable these features:

- **Tavily** (web search): Query + search results
- **Jina** (URL parsing): URL + parsed content
- **E2B** (code execution): Code snippets executed
- **Groq** (transcription): Audio files transcribed

Each has their own privacy policy. These are optional - disable if not needed.

---

## Data Retention (Self-Hosted)

**You control retention policies**. Default behavior:

- **Conversations**: Kept until you delete them
- **Messages**: Kept until conversation deleted
- **Memories**: Expire after 90 days (configurable)
- **Files**: Kept until manually deleted
- **Usage records**: Kept indefinitely for cost tracking

**Export data anytime**:
```bash
bunx convex export --output backup.json
```

**Delete all data**:
Delete your Convex project = all data permanently deleted.

---

## Cookies (Self-Hosted Web UI)

**Session cookies only** (from Clerk):
- `__session`: Authentication session (expires in 7 days)
- `__client_uat`: User authentication token

**No tracking cookies**: No analytics, no advertising, no third-party trackers.

---

## GDPR Compliance (Self-Hosted)

If you're in the EU or serve EU users:

### Data Controller
**You are the data controller** for your self-hosted instance. Responsibilities:
- Inform users what data you collect
- Obtain consent where required
- Honor data subject requests (access, deletion, portability)
- Implement appropriate security measures

### Data Processors
- Convex (stores your data)
- Clerk (manages authentication)
- AI providers (process messages)

Each is GDPR-compliant, but **you** are responsible for contracts (DPAs).

### User Rights

Users of your instance can request:
- **Access**: Export their data (`bunx convex export`)
- **Deletion**: Delete user account (deletes all associated data)
- **Portability**: Export in JSON format (machine-readable)
- **Rectification**: Edit profile, preferences

### Legal Basis
- **Consent**: Users agree to your instance's terms
- **Legitimate interest**: Service functionality, security

---

## Security Measures

**Your responsibility** as self-host operator:

- **Encryption in transit**: HTTPS (use Vercel, Railway, or reverse proxy)
- **Encryption at rest**: Convex encrypts data at rest (AES-256)
- **Access control**: Limit who can access your Convex/Clerk dashboards
- **Secrets management**: Keep API keys secure (use environment variables)
- **Updates**: Keep blah.chat updated (security patches)

**We provide**:
- Secure defaults (no insecure configurations)
- Dependency updates (via Dependabot)
- Security advisories (GitHub Security tab)

---

## Children's Privacy

blah.chat is not intended for children under 13 (or 16 in EU). Self-hosted operators should:
- Verify user ages if serving minors
- Obtain parental consent where required
- Comply with COPPA (US) or GDPR (EU) for children

---

## Changes to Privacy Policy

**Self-hosted privacy policy** (this document):
- Updated when features change data collection
- Versioned in Git (see commit history)
- Major changes announced in release notes

**Your instance**: If you modify blah.chat, update this policy accordingly.

---

## Compliance for Modifiers

If you modify blah.chat and distribute:

### AGPLv3 Requirements
- Provide modified source code to users (Section 13)
- Include this privacy policy or your modified version
- Disclose what data you collect

### Attribution
- Keep "Powered by blah.chat" notice (optional but appreciated)
- Indicate if you've modified the software

---

## Questions or Concerns

**For self-hosted instances**:
- GitHub Discussions: https://github.com/bhekanik/blah.chat/discussions
- GitHub Issues: https://github.com/bhekanik/blah.chat/issues
- Email: blah.chat@bhekani.com

**For cloud version (when launched)**:
- See https://blah.chat/privacy

---

## Transparency

This privacy policy is open source (like the software):
- View history: https://github.com/bhekanik/blah.chat/commits/main/PRIVACY.md
- Suggest improvements: Submit PR
- Report privacy issues: Email blah.chat@bhekani.com (we respond within 48h)

---

**Thank you for respecting user privacy.** Self-hosting gives users control over their data - that's the point. We're committed to keeping telemetry optional, anonymous, and transparent.
