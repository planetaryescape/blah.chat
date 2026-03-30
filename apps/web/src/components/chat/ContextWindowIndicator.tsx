"use client";

interface ContextWindowIndicatorProps {
  conversationId: string;
  modelId: string; // Currently selected model
}

export function ContextWindowIndicator({
  conversationId,
  modelId,
}: ContextWindowIndicatorProps) {
  void conversationId;
  void modelId;

  // The Postgres-backed app does not have REST routes for this indicator yet.
  // Returning null avoids repeated 404s until the backend contract exists.
  return null;
}
