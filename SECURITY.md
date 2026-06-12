# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

**Recommendation**: Always run the latest version from `main` branch or the latest release.

---

## Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

### Private Reporting

**Email**: blah.chat@bhekani.com

**Subject**: `[SECURITY] Brief description`

**Response time**: We aim to respond within **48 hours** (usually faster).

### What to Include

Please include as much of the following as possible:

- **Type of vulnerability** (e.g., SQL injection, XSS, auth bypass, RCE)
- **Affected component** (file path, function name, endpoint)
- **Steps to reproduce** (detailed PoC if possible)
- **Impact assessment** (what can an attacker do?)
- **Suggested fix** (if you have one)
- **Your name/handle** (for credit in disclosure, optional)

### What to Expect

1. **Acknowledgment** (within 48h)
   - We'll confirm receipt and assess severity

2. **Investigation** (1-7 days)
   - We'll validate the issue and determine impact
   - We may ask for clarification or additional details

3. **Fix development** (1-14 days, depending on severity)
   - Critical: 1-3 days
   - High: 3-7 days
   - Medium: 7-14 days
   - Low: 14-30 days

4. **Coordinated disclosure** (after fix is released)
   - We'll create a GitHub Security Advisory
   - You'll be credited (if you wish)
   - CVE assigned if applicable

### Bug Bounty

**Current status**: No formal bug bounty program.

However, we appreciate security research and will:
- Credit you in release notes and security advisory
- Send you swag (when available)
- Prioritize your future issues/PRs

For critical vulnerabilities, we may offer a monetary thank-you on a case-by-case basis.

---

## Security Best Practices for Self-Hosting

If you're running a self-hosted instance:

### 1. Keep Software Updated

```bash
# Check for updates
git fetch origin
git log HEAD..origin/main --oneline

# Update (after reviewing changes)
git pull origin main
bun install
bun run db:migrate
bun run build
```

**Subscribe to releases**: Watch this repo → Custom → Releases

### 2. Secure Environment Variables

**Never commit** `.env.local` or expose API keys.

**Use environment-specific secrets**:
- **Vercel/Railway**: Use their encrypted secrets management
- **Docker**: Use Docker secrets or environment files with restricted permissions
- **VPS**: Use systemd EnvironmentFile with `chmod 600`

**Rotate keys regularly**:
- Regenerate Clerk webhooks secrets every 90 days
- Rotate AI Gateway keys every 6 months

### 3. Access Control

**Limit admin access**:
- Only trusted users should have `isAdmin: true` in the database
- Admin routes are protected, but verify in production

**Service dashboards**:
- Enable 2FA on your database host account (e.g. Neon)
- Enable 2FA on Clerk account
- Enable 2FA on Trigger.dev account
- Limit team member access to "need-to-know"

### 4. Network Security

**Use HTTPS everywhere**:
- Vercel/Railway provide this automatically
- For VPS, use Let's Encrypt + nginx/Caddy

**Restrict Clerk webhooks**:
- Verify webhook signatures (already implemented in code)
- Use firewall rules to only allow Clerk IPs (if self-hosting)

**Rate limiting** (if using reverse proxy):
```nginx
# nginx example
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

### 5. Database Security

**Application-level security** (built-in):
- All API routes require Clerk authentication
- Queries are scoped by user ID at the persistence layer (Drizzle)
- All queries are parameterized via Drizzle ORM

**Postgres hardening** (your responsibility):
- Use connection pooling (Neon pooled connections or PgBouncer)
- Restrict database user permissions
- Encrypt at rest (Neon does this by default; enable disk encryption if self-managed)
- Regular backups with encryption (`pg_dump` or Neon point-in-time restore)

### 6. Dependency Security

**Automated updates**:
- Dependabot PRs are auto-created (review and merge)
- `bun update` to check for updates manually

**Check for vulnerabilities**:
```bash
bun audit
```

**Review before updating**:
- Check changelog for breaking changes
- Test in development before production

### 7. Secrets in Logs

**Avoid logging sensitive data**:
- API keys are never logged (by design)
- Error stack traces may contain env vars - review before sharing

**If you accidentally commit secrets**:
1. Revoke the key immediately
2. Use `git filter-repo` to remove from history (not just delete commit)
3. Force push to GitHub
4. Rotate all related credentials

### 8. Content Security Policy

**Add CSP headers** (if using reverse proxy):
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com; connect-src 'self' https://*.clerk.accounts.dev;";
```

Adjust based on your integrations.

---

## Known Security Considerations

### Architecture Decisions

**External services** (Neon, Trigger.dev, Clerk, AI providers):
- **Trade-off**: Convenience vs. control
- **Mitigation**: Core services are SOC 2 certified
- **Alternative**: Postgres, Redis, and object storage can be fully self-hosted via Docker Compose (see SELF_HOSTING.md)

**AI model access**:
- **Risk**: Message content sent to third-party AI providers
- **Mitigation**: Use providers with strong privacy policies (OpenAI, Anthropic don't train on API data)
- **User control**: Users choose which models to enable

**Telemetry** (optional):
- **Risk**: Instance metrics sent to PostHog
- **Mitigation**: Anonymous, aggregate only (no PII)
- **User control**: `TELEMETRY_DISABLED=1` to opt-out
- **Transparency**: See PRIVACY.md for full disclosure

### Code-Level Safeguards

**XSS prevention**:
- React auto-escapes JSX (enabled by default)
- Markdown rendering uses `react-markdown` (sanitized)
- User input never rendered as raw HTML

**SQL injection**:
- All database access goes through Drizzle ORM (parameterized queries)
- No raw SQL built from user input

**Command injection**:
- No user input passed to shell commands

**Authentication bypass**:
- All API routes verify the Clerk session server-side
- Persistence-layer queries are filtered by the authenticated user's ID
- No client-side auth checks relied upon

**Rate limiting**:
- Daily message limits enforced server-side
- Monthly budget limits enforced server-side
- Can be overridden via env vars (self-hosted operators decide)

### Dependencies

**High-risk dependencies** (regularly monitored):
- `next` - Core framework
- `react` - Core UI library
- `drizzle-orm` - Database ORM
- `@clerk/nextjs` - Authentication

**Audit frequency**: Dependencies reviewed weekly, critical updates applied within 24h.

---

## Security Checklist for Deployers

Before going to production:

- [ ] HTTPS enabled (certificate valid)
- [ ] Environment variables secured (not committed, encrypted at rest)
- [ ] 2FA enabled on database host account (e.g. Neon)
- [ ] 2FA enabled on Clerk account
- [ ] Webhook secrets configured and verified
- [ ] Admin access limited to trusted users only
- [ ] Backups configured (scheduled `pg_dump` or managed backups, e.g. Neon)
- [ ] Monitoring enabled (error tracking, uptime)
- [ ] Rate limiting configured (if reverse proxy)
- [ ] Logs reviewed for sensitive data exposure
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Dependency audit clean (`bun audit`)

---

## Incident Response Plan

If you discover a security breach in your self-hosted instance:

1. **Contain**:
   - Revoke compromised API keys immediately
   - Lock down admin access
   - Review access logs (database host dashboard, application logs)

2. **Assess**:
   - What data was accessed?
   - How did the breach occur?
   - Is the vulnerability still exploitable?

3. **Remediate**:
   - Apply security patches
   - Rotate all credentials
   - Update dependencies

4. **Notify** (if applicable):
   - Inform affected users (GDPR requirement if EU users)
   - Report to blah.chat maintainers (blah.chat@bhekani.com) if vulnerability in core code

5. **Post-mortem**:
   - Document what happened
   - Update security procedures
   - Share learnings (if appropriate)

---

## Security Audit Status

**Last audit**: N/A (pre-launch)

**Planned**: We plan to conduct a professional security audit after reaching 1,000+ self-hosted instances.

**Want to help?** Security researchers are welcome to review the codebase. Contact blah.chat@bhekani.com for access to a test environment.

---

## Security-Related Configuration

### Recommended `next.config.ts` Security Headers

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ];
},
```

### Clerk Security Settings

**Recommended**:
- Enable multi-factor authentication
- Set session lifetime to 7 days (balance security/UX)
- Enable bot detection
- Configure allowed email domains (if enterprise)

**Webhook verification** (already implemented in `/api/webhooks/clerk`):
```typescript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
wh.verify(body, headers); // Throws if invalid signature
```

### Database Query Best Practices

**User scoping** (pattern used throughout the persistence layer):
```typescript
// ✅ GOOD - filters by authenticated user
const conversations = await db.query.conversations.findMany({
  where: eq(conversations.userId, user.id),
});

// ❌ BAD - returns all users' conversations
const conversations = await db.query.conversations.findMany();
```

---

## Compliance

**GDPR** (if serving EU users):
- See PRIVACY.md for data handling
- User data export: `pg_dump` or per-user SQL export
- User data deletion: Delete user account (cascades to all data)
- DPA agreements: Required with your Postgres host (e.g. Neon), Trigger.dev, Clerk

**CCPA** (if serving California users):
- Same rights as GDPR
- "Do Not Sell" - N/A (we don't sell data)

**SOC 2** (for enterprise self-hosters):
- Neon: SOC 2 Type II certified
- Clerk: SOC 2 Type II certified
- Your responsibility: Access controls, logging, incident response

---

## Questions?

- **General security**: blah.chat@bhekani.com
- **Vulnerability reports**: blah.chat@bhekani.com (mark subject `[SECURITY]`)
- **Self-hosting security**: GitHub Discussions

---

**Security is a shared responsibility.** We provide secure defaults, but self-hosters must follow best practices. Thank you for helping keep blah.chat secure!
