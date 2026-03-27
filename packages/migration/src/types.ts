/**
 * Convex export document interfaces.
 *
 * Each type mirrors the shape of a row in the Convex JSONL export.
 * Every document has `_id` (Convex string ID) and `_creationTime` (epoch ms).
 */

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export interface ConvexDocument {
  _id: string;
  _creationTime: number;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface ConvexUser extends ConvexDocument {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  isAdmin?: boolean;
  dailyMessageCount?: number;
  lastMessageDate?: string;
  tier?: "free" | "tier1" | "tier2";
  dailyProModelCount?: number;
  lastProModelDate?: string;
  monthlyProModelCount?: number;
  lastProModelMonth?: string;
  dailyPresentationCount?: number;
  lastPresentationDate?: string;
  disabledBuiltInTemplateIds?: string[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// User Preferences
// ---------------------------------------------------------------------------

export interface ConvexUserPreference extends ConvexDocument {
  userId: string;
  category: string;
  key: string;
  value: unknown;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export interface ConvexConversation extends ConvexDocument {
  userId: string;
  title: string;
  model: string;
  pinned: boolean;
  archived: boolean;
  starred: boolean;
  systemPrompt?: string;
  projectId?: string;
  lastMemoryExtractionAt?: number;
  memoryExtractionMessageCount?: number;
  cachedMemoryIds?: string[];
  lastMemoryFetchAt?: number;
  lastExtractedMessageId?: string;
  tokenUsage?: {
    systemTokens: number;
    messagesTokens: number;
    memoriesTokens: number;
    totalTokens: number;
    contextLimit: number;
    lastCalculatedAt: number;
  };
  messageCount?: number;
  lastMessageAt: number;
  parentConversationId?: string;
  parentMessageId?: string;
  activeLeafMessageId?: string;
  branchCount?: number;
  isCollaborative?: boolean;
  isIncognito?: boolean;
  isPresentation?: boolean;
  enableGrounding?: boolean;
  incognitoSettings?: {
    enableReadTools: boolean;
    applyCustomInstructions: boolean;
    inactivityTimeoutMinutes?: number;
    scheduledDeletionId?: string;
    lastActivityAt: number;
  };
  modelRecommendation?: {
    suggestedModelId: string;
    currentModelId: string;
    reasoning: string;
    estimatedSavings: {
      costReduction: string;
      percentSaved: number;
    };
    createdAt: number;
    dismissed: boolean;
  };
  mode?: "document" | "normal";
  modeActivatedAt?: number;
  cachedSystemPrompt?: string;
  promptInputHash?: string;
  promptBuiltAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface ConvexMessageVotes {
  rating: "left_better" | "right_better" | "tie" | "both_bad";
  isWinner: boolean;
  votedAt: number;
}

export interface ConvexRoutingClassification {
  primaryCategory: string;
  secondaryCategory?: string;
  complexity: string;
  requiresVision: boolean;
  requiresLongContext: boolean;
  requiresReasoning: boolean;
  confidence: number;
  isHighStakes?: boolean;
  highStakesDomain?: string;
  recommendedAction?: string;
  changeReason?: string;
}

export interface ConvexRoutingTrace {
  routerMode: string;
  hardRuleMatched?: string;
  topSimilarityScore?: number;
  topRouteLabel?: string;
  secondRouteLabel?: string;
  secondSimilarityScore?: number;
  usedFallbackLlm?: boolean;
  embeddingLatencyMs?: number;
  totalLatencyMs?: number;
  candidateModels?: string[];
}

export interface ConvexRoutingDecision {
  selectedModelId: string;
  classification: ConvexRoutingClassification;
  reasoning: string;
  isSticky?: boolean;
  routeLabel?: string;
  classifierVersion?: string;
  trace?: ConvexRoutingTrace;
}

export interface ConvexMessageSource {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  snippet?: string;
}

export interface ConvexMessageSourceMetadata {
  sourceId: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
  domain: string;
  fetchedAt?: number;
  error?: string;
}

export interface ConvexMessage extends ConvexDocument {
  conversationId: string;
  userId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent?: string;
  status: "pending" | "generating" | "complete" | "stopped" | "error";
  model?: string;
  clientMessageId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  reasoning?: string;
  partialReasoning?: string;
  reasoningTokens?: number;
  thinkingStartedAt?: number;
  thinkingCompletedAt?: number;
  error?: string;
  embedding?: number[];
  providerMetadata?: unknown;
  // Legacy single parent
  parentMessageId?: string;
  branchLabel?: string;
  branchIndex?: number;
  // Tree architecture
  parentMessageIds?: string[];
  siblingIndex?: number;
  isActiveBranch?: boolean;
  rootMessageId?: string;
  forkReason?: "edit" | "regenerate" | "branch" | "model_compare" | "merge";
  forkMetadata?: {
    originalContent?: string;
    originalBranchId?: string;
    mergedFromIds?: string[];
    branchedAt?: number;
    branchedBy?: string;
  };
  // Comparison
  comparisonGroupId?: string;
  consolidatedMessageId?: string;
  isConsolidation?: boolean;
  votes?: ConvexMessageVotes;
  generationStartedAt?: number;
  generationCompletedAt?: number;
  apiCallStartedAt?: number;
  firstTokenAt?: number;
  tokensPerSecond?: number;
  memoryExtracted?: boolean;
  memoryExtractedAt?: number;
  routingDecision?: ConvexRoutingDecision;
  // Deprecated embedded sources
  sources?: ConvexMessageSource[];
  partialSources?: ConvexMessageSource[];
  sourceMetadata?: ConvexMessageSourceMetadata[];
  failedModels?: string[];
  retryCount?: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface ConvexAttachment extends ConvexDocument {
  messageId: string;
  conversationId: string;
  userId: string;
  type: "image" | "file" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    prompt?: string;
    model?: string;
    generationTime?: number;
  };
  extractedText?: string;
  extractedAt?: number;
  extractionError?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Tool Calls
// ---------------------------------------------------------------------------

export interface ConvexToolCall extends ConvexDocument {
  messageId: string;
  conversationId: string;
  userId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  textPosition?: number;
  isPartial: boolean;
  timestamp: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Sources (normalized)
// ---------------------------------------------------------------------------

export interface ConvexSourceMetadata extends ConvexDocument {
  urlHash: string;
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
  siteName?: string;
  enriched: boolean;
  enrichedAt?: number;
  enrichmentError?: string;
  firstSeenAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface ConvexSource extends ConvexDocument {
  messageId: string;
  conversationId: string;
  userId: string;
  position: number;
  provider: string;
  title?: string;
  snippet?: string;
  urlHash: string;
  url: string;
  isPartial: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

export interface ConvexMemory extends ConvexDocument {
  userId: string;
  content: string;
  embedding: number[];
  conversationId?: string;
  sourceMessageId?: string;
  sourceMessageIds?: string[];
  metadata: {
    category: string;
    importance?: number;
    reasoning?: string;
    extractedAt?: number;
    sourceConversationId?: string;
    confidence?: number;
    verifiedBy?: "auto" | "manual" | "consolidated";
    expiresAt?: number;
    version?: number;
    supersededBy?: string;
    expirationHint?: "contextual" | "preference" | "deadline" | "temporary";
  };
  memoryType?: "episodic" | "semantic" | "procedural";
  stability?: number;
  accessCount?: number;
  lastAccessed?: number;
  retention?: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface ConvexProject extends ConvexDocument {
  userId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  isTemplate?: boolean;
  createdFrom?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Project Junctions
// ---------------------------------------------------------------------------

export interface ConvexProjectConversation extends ConvexDocument {
  projectId: string;
  conversationId: string;
  addedAt: number;
  addedBy: string;
}

export interface ConvexProjectNote extends ConvexDocument {
  projectId: string;
  noteId: string;
  userId: string;
  addedAt: number;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface ConvexTask extends ConvexDocument {
  userId: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  deadline?: number;
  deadlineSource?: string;
  urgency?: "low" | "medium" | "high" | "urgent";
  tags?: string[];
  sourceType?:
    | "transcript"
    | "conversation"
    | "manual"
    | "file"
    | "smart_assistant";
  sourceId?: string;
  sourceContext?: {
    snippet?: string;
    timestampSeconds?: number;
    confidence?: number;
  };
  projectId?: string;
  priority?: number;
  position?: number;
  completedAt?: number;
  embedding?: number[];
  embeddingStatus?: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export interface ConvexBookmark extends ConvexDocument {
  userId: string;
  messageId: string;
  conversationId: string;
  note?: string;
  tags?: string[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface ConvexNote extends ConvexDocument {
  userId: string;
  title: string;
  content: string;
  htmlContent?: string;
  sourceMessageId?: string;
  sourceConversationId?: string;
  sourceSelectionText?: string;
  projectId?: string;
  tags?: string[];
  suggestedTags?: string[];
  isPinned: boolean;
  shareId?: string;
  isPublic?: boolean;
  sharePassword?: string;
  shareExpiresAt?: number;
  shareCreatedAt?: number;
  shareViewCount?: number;
  embedding?: number[];
  embeddingStatus?: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

export interface ConvexShare extends ConvexDocument {
  userId: string;
  conversationId: string;
  shareId: string;
  title: string;
  expiresAt?: number;
  isPublic: boolean;
  isActive: boolean;
  password?: string;
  anonymizeUsernames?: boolean;
  viewCount: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Usage Records
// ---------------------------------------------------------------------------

export interface ConvexUsageRecord extends ConvexDocument {
  userId: string;
  date: string;
  model: string;
  conversationId?: string;
  presentationId?: string;
  feature?:
    | "chat"
    | "notes"
    | "tasks"
    | "files"
    | "memory"
    | "smart_assistant"
    | "slides";
  operationType?: "text" | "tts" | "stt" | "image" | "embedding";
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cost: number;
  messageCount: number;
  warningsSent?: string[];
  isByok?: boolean;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface ConvexTemplate extends ConvexDocument {
  userId?: string;
  name: string;
  prompt: string;
  description?: string;
  category: string;
  isBuiltIn: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Votes (standalone table)
// ---------------------------------------------------------------------------

export interface ConvexVote extends ConvexDocument {
  userId: string;
  comparisonGroupId: string;
  winnerId?: string;
  rating: "left_better" | "right_better" | "tie" | "both_bad";
  votedAt: number;
}

// ---------------------------------------------------------------------------
// Starter Suggestions Cache
// ---------------------------------------------------------------------------

export interface ConvexChatSuggestionsCache extends ConvexDocument {
  userId: string;
  fingerprint: string;
  suggestions: Array<{
    id: string;
    text: string;
    icon: "sparkles" | "brain" | "zap" | "penLine";
  }>;
  generatedAt: number;
  expiresAt: number;
  lastRefreshAttemptAt?: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// TTS Cache
// ---------------------------------------------------------------------------

export interface ConvexTtsCache extends ConvexDocument {
  hash: string;
  storageId: string;
  text: string;
  voice: string;
  speed: number;
  format: string;
  createdAt: number;
  lastAccessedAt: number;
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export interface ConvexFeedback extends ConvexDocument {
  userId: string;
  userEmail: string;
  userName: string;
  page: string;
  feedbackType: "bug" | "feature" | "praise" | "other";
  description: string;
  whatTheyDid?: string;
  whatTheySaw?: string;
  whatTheyExpected?: string;
  screenshotStorageId?: string;
  status: string;
  priority?: string;
  userSuggestedUrgency?: "urgent" | "normal" | "low";
  tags?: string[];
  aiTriage?: {
    suggestedPriority: string;
    suggestedTags: string[];
    possibleDuplicateId?: string;
    triageNotes: string;
    createdAt: number;
  };
  assignedTo?: string;
  archivedAt?: number;
  errorContext?: {
    conversationId?: string;
    messageId?: string;
    modelId?: string;
    errorMessage?: string;
    errorType?: string;
    failedModels?: string[];
    userAgent?: string;
    environment?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Knowledge Sources & Chunks
// ---------------------------------------------------------------------------

export interface ConvexKnowledgeSource extends ConvexDocument {
  userId: string;
  projectId?: string;
  type: "file" | "text" | "web" | "youtube";
  title: string;
  description?: string;
  storageId?: string;
  url?: string;
  rawContent?: string;
  videoMetadata?: {
    videoId: string;
    duration?: number;
    channel?: string;
    thumbnailUrl?: string;
  };
  mimeType?: string;
  size?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  chunkCount?: number;
  processedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConvexKnowledgeChunk extends ConvexDocument {
  sourceId: string;
  userId: string;
  projectId?: string;
  content: string;
  chunkIndex: number;
  charOffset: number;
  tokenCount: number;
  startTime?: string;
  endTime?: string;
  pageNumber?: number;
  embedding: number[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// CLI API Keys
// ---------------------------------------------------------------------------

export interface ConvexCliApiKey extends ConvexDocument {
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: number;
  createdAt: number;
  revokedAt?: number;
}

// ---------------------------------------------------------------------------
// User API Keys (BYOK)
// ---------------------------------------------------------------------------

export interface ConvexUserApiKeys extends ConvexDocument {
  userId: string;
  byokEnabled: boolean;
  encryptedVercelGatewayKey?: string;
  encryptedOpenRouterKey?: string;
  encryptedGroqKey?: string;
  encryptedDeepgramKey?: string;
  encryptionIVs?: string;
  authTags?: string;
  lastValidated?: {
    vercelGateway?: number;
    openRouter?: number;
    groq?: number;
    deepgram?: number;
  };
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Composio Connections
// ---------------------------------------------------------------------------

export interface ConvexComposioConnection extends ConvexDocument {
  userId: string;
  composioConnectionId: string;
  integrationId: string;
  integrationName: string;
  status: "pending" | "initiated" | "active" | "expired" | "failed";
  scopes?: string[];
  oauthState?: string;
  oauthStateExpiresAt?: number;
  connectedAt?: number;
  lastUsedAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Routing Examples & Feedback (normalized tables)
// ---------------------------------------------------------------------------

export interface ConvexRoutingExample extends ConvexDocument {
  text: string;
  route_label: string;
  complexity?: string;
  source: string;
  embedding?: number[];
  metadata?: unknown;
  createdAt: number;
}

export interface ConvexRoutingFeedback extends ConvexDocument {
  messageId: string;
  conversationId: string;
  userId: string;
  selectedModelId: string;
  routeLabel: string;
  signal: string;
  metadata?: unknown;
  createdAt: number;
}
