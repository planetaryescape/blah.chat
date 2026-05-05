import "server-only";
import { Resend } from "resend";

/**
 * Centralised Resend mailer. Lazily-instantiated so callers in non-prod
 * environments without `RESEND_API_KEY` set can still import this module
 * without a hard crash. `sendEmail()` returns `{ delivered: false }` when
 * the API key isn't set (logs a warning) so admin actions degrade
 * gracefully instead of throwing.
 */

let cached: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  delivered: boolean;
  id?: string;
  reason?: string;
}

const DEFAULT_FROM = "blah.chat <noreply@blah.chat>";

function undelivered(reason: string): SendEmailResult {
  return { delivered: false, reason };
}

function getFromAddress(input: SendEmailInput): string {
  return input.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    return undelivered("RESEND_API_KEY not configured");
  }

  const result = await client.emails.send({
    from: getFromAddress(input),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    tags: input.tags,
  });

  if (result.error) {
    return undelivered(result.error.message ?? "Resend send failed");
  }

  return { delivered: true, id: result.data?.id };
}
