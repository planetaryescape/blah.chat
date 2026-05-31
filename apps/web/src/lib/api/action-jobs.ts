import { createHmac, timingSafeEqual } from "node:crypto";

const SEPARATOR = ".";

function getActionJobSecret() {
  const secret = process.env.INTERNAL_TASK_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_TASK_SECRET is not configured");
  }
  return secret;
}

function signatureFor(runId: string, userId: string) {
  return createHmac("sha256", getActionJobSecret())
    .update(`${userId}:${runId}`)
    .digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function signActionJobId(runId: string, userId: string) {
  return `${runId}${SEPARATOR}${signatureFor(runId, userId)}`;
}

export function resolveSignedActionJobId(jobId: string, userId: string) {
  const separatorIndex = jobId.lastIndexOf(SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === jobId.length - 1) {
    return null;
  }

  const runId = jobId.slice(0, separatorIndex);
  const signature = jobId.slice(separatorIndex + 1);
  return secureEqual(signature, signatureFor(runId, userId)) ? runId : null;
}
