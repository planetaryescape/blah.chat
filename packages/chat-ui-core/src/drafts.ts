import type { ChatComposerSurfaceId } from "./commands";

export const WEB_MOBILE_DRAFT_STORAGE_KEY = "blahchat:composer-drafts:v1";
export const CLI_DRAFT_STORAGE_KEY = "blahchat-cli:composer-drafts:v1";

export type ChatComposerThinkingEffort = "none" | "low" | "medium" | "high";

export interface PersistedDraftAttachmentV1 {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
}

export interface ChatComposerDraftV1 {
  version: 1;
  surfaceId: ChatComposerSurfaceId;
  conversationId: string;
  text: string;
  attachments: PersistedDraftAttachmentV1[];
  selectedModel: string | null;
  selectedIntegrationIds: string[];
  thinkingEffort: ChatComposerThinkingEffort;
  quote: string | null;
  comparisonMode: boolean;
  selectedModels: string[];
  updatedAt: number;
}

export type ChatComposerDraftRecord = Record<string, ChatComposerDraftV1>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAttachment(
  value: unknown,
): PersistedDraftAttachmentV1 | null {
  if (!isObject(value)) return null;
  const { type, name, storageId, mimeType, size } = value;
  if (
    (type !== "file" && type !== "image" && type !== "audio") ||
    typeof name !== "string" ||
    typeof storageId !== "string" ||
    typeof mimeType !== "string" ||
    typeof size !== "number" ||
    !Number.isFinite(size)
  ) {
    return null;
  }

  return { type, name, storageId, mimeType, size };
}

function normalizeDraft(
  conversationId: string,
  value: unknown,
): ChatComposerDraftV1 | null {
  if (typeof value === "string") {
    const draft = emptyDraft({
      surfaceId: "web",
      conversationId,
    });
    draft.text = value;
    draft.updatedAt = Date.now();
    return draft;
  }

  if (!isObject(value)) return null;

  const surfaceId = value.surfaceId;
  const text = value.text;
  const attachments = value.attachments;
  const selectedModel = value.selectedModel;
  const selectedIntegrationIds = value.selectedIntegrationIds;
  const thinkingEffort = value.thinkingEffort;
  const quote = value.quote;
  const comparisonMode = value.comparisonMode;
  const selectedModels = value.selectedModels;
  const updatedAt = value.updatedAt;

  if (
    (surfaceId !== "web" && surfaceId !== "mobile" && surfaceId !== "cli") ||
    typeof text !== "string" ||
    !Array.isArray(attachments) ||
    (selectedModel !== null && typeof selectedModel !== "string") ||
    (selectedIntegrationIds !== undefined &&
      !Array.isArray(selectedIntegrationIds)) ||
    (thinkingEffort !== "none" &&
      thinkingEffort !== "low" &&
      thinkingEffort !== "medium" &&
      thinkingEffort !== "high") ||
    (quote !== null && typeof quote !== "string") ||
    typeof comparisonMode !== "boolean" ||
    !Array.isArray(selectedModels) ||
    typeof updatedAt !== "number" ||
    !Number.isFinite(updatedAt)
  ) {
    return null;
  }

  const normalizedAttachments = attachments
    .map(normalizeAttachment)
    .filter(
      (attachment): attachment is PersistedDraftAttachmentV1 =>
        attachment !== null,
    );
  const normalizedSelectedModels = selectedModels.filter(
    (model): model is string => typeof model === "string" && model.length > 0,
  );
  const normalizedSelectedIntegrationIds = (
    selectedIntegrationIds ?? []
  ).filter(
    (integrationId): integrationId is string =>
      typeof integrationId === "string" && integrationId.length > 0,
  );

  return {
    version: 1,
    surfaceId,
    conversationId,
    text,
    attachments: normalizedAttachments,
    selectedModel,
    selectedIntegrationIds: normalizedSelectedIntegrationIds,
    thinkingEffort,
    quote,
    comparisonMode:
      normalizedSelectedModels.length < 2 ? false : comparisonMode,
    selectedModels: normalizedSelectedModels,
    updatedAt,
  };
}

export function emptyDraft(input: {
  surfaceId: ChatComposerSurfaceId;
  conversationId: string;
}): ChatComposerDraftV1 {
  return {
    version: 1,
    surfaceId: input.surfaceId,
    conversationId: input.conversationId,
    text: "",
    attachments: [],
    selectedModel: null,
    selectedIntegrationIds: [],
    thinkingEffort: "none",
    quote: null,
    comparisonMode: false,
    selectedModels: [],
    updatedAt: Date.now(),
  };
}

export function isEmptyDraft(draft: ChatComposerDraftV1): boolean {
  return (
    draft.text.trim().length === 0 &&
    draft.attachments.length === 0 &&
    draft.selectedModel === null &&
    draft.selectedIntegrationIds.length === 0 &&
    draft.thinkingEffort === "none" &&
    draft.quote === null &&
    draft.comparisonMode === false &&
    draft.selectedModels.length === 0
  );
}

export function migrateDraftRecord(raw: unknown): ChatComposerDraftRecord {
  if (!isObject(raw)) return {};

  const next: ChatComposerDraftRecord = {};

  for (const [conversationId, value] of Object.entries(raw)) {
    const normalized = normalizeDraft(conversationId, value);
    if (!normalized || isEmptyDraft(normalized)) continue;
    next[conversationId] = normalized;
  }

  return next;
}

export function serializeDraftRecord(record: ChatComposerDraftRecord): string {
  const next: ChatComposerDraftRecord = {};

  for (const [conversationId, draft] of Object.entries(record)) {
    if (isEmptyDraft(draft)) continue;
    next[conversationId] = {
      ...draft,
      version: 1,
      conversationId,
    };
  }

  return JSON.stringify(next);
}

export function deserializeDraftRecord(raw: string | null | undefined) {
  if (!raw) return {};

  try {
    return migrateDraftRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}
