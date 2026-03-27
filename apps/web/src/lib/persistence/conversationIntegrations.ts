import {
  composioConnections,
  conversationIntegrationEvents,
  generationRequestIntegrations,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { INTEGRATIONS_BY_ID } from "@blah-chat/shared/integrations";
import { and, asc, eq } from "drizzle-orm";
import { BadRequestError } from "@/lib/api/errors";

function normalizeSelectedIntegrationIds(selectedIntegrationIds: string[]) {
  return [
    ...new Set(selectedIntegrationIds.map((id) => id.trim()).filter(Boolean)),
  ]
    .filter((id) => INTEGRATIONS_BY_ID.has(id))
    .sort();
}

export async function listConversationIntegrationEvents(
  db: PersistenceDb,
  conversationId: string,
) {
  return db.query.conversationIntegrationEvents.findMany({
    where: eq(conversationIntegrationEvents.conversationId, conversationId),
    orderBy: [
      asc(conversationIntegrationEvents.createdAt),
      asc(conversationIntegrationEvents.id),
    ],
  });
}

export async function getConversationSelectedIntegrationIds(
  db: PersistenceDb,
  conversationId: string,
) {
  const events = await listConversationIntegrationEvents(db, conversationId);
  const selected = new Set<string>();

  for (const event of events) {
    if (event.action === "enabled") {
      selected.add(event.integrationId);
      continue;
    }

    if (event.action === "disabled") {
      selected.delete(event.integrationId);
    }
  }

  return [...selected].sort();
}

export async function setConversationSelectedIntegrations(input: {
  db: PersistenceDb;
  conversationId: string;
  userId: string;
  selectedIntegrationIds: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const normalizedSelected = normalizeSelectedIntegrationIds(
    input.selectedIntegrationIds,
  );

  if (
    normalizedSelected.length !==
    input.selectedIntegrationIds.filter(Boolean).length
  ) {
    const invalidIds = input.selectedIntegrationIds.filter(
      (id) => id && !INTEGRATIONS_BY_ID.has(id),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestError(
        `Unknown integrations: ${invalidIds.join(", ")}`,
      );
    }
  }

  const currentSelected = await getConversationSelectedIntegrationIds(
    input.db,
    input.conversationId,
  );
  const currentSet = new Set(currentSelected);
  const nextSet = new Set(normalizedSelected);
  const now = Date.now();

  const disables = currentSelected.filter((id) => !nextSet.has(id));
  const enables = normalizedSelected.filter((id) => !currentSet.has(id));
  const changes = [
    ...disables.map((integrationId) => ({
      action: "disabled" as const,
      integrationId,
    })),
    ...enables.map((integrationId) => ({
      action: "enabled" as const,
      integrationId,
    })),
  ];

  if (changes.length === 0) {
    return {
      selectedIntegrationIds: currentSelected,
      events: [],
    };
  }

  const inserted = await input.db
    .insert(conversationIntegrationEvents)
    .values(
      changes.map((change, index) => {
        const integration = INTEGRATIONS_BY_ID.get(change.integrationId);
        if (!integration) {
          throw new BadRequestError(
            `Unknown integration: ${change.integrationId}`,
          );
        }

        return {
          conversationId: input.conversationId,
          userId: input.userId,
          integrationId: integration.id,
          integrationName: integration.name,
          action: change.action,
          source: input.source ?? "composer",
          metadata: input.metadata ?? null,
          createdAt: now + index,
        };
      }),
    )
    .returning();

  return {
    selectedIntegrationIds: normalizedSelected,
    events: inserted,
  };
}

export async function snapshotGenerationRequestIntegrations(input: {
  db: PersistenceDb;
  requestId: string;
  userId: string;
  selectedIntegrationIds: string[];
}) {
  const normalizedSelected = normalizeSelectedIntegrationIds(
    input.selectedIntegrationIds,
  );

  if (normalizedSelected.length === 0) {
    return [];
  }

  const activeConnections = await input.db.query.composioConnections.findMany({
    where: and(
      eq(composioConnections.userId, input.userId),
      eq(composioConnections.status, "active"),
    ),
  });
  const connectionByIntegrationId = new Map(
    activeConnections.map((connection) => [
      connection.integrationId,
      connection,
    ]),
  );

  const inserted = await input.db
    .insert(generationRequestIntegrations)
    .values(
      normalizedSelected.map((integrationId, index) => {
        const integration = INTEGRATIONS_BY_ID.get(integrationId);
        if (!integration) {
          throw new BadRequestError(`Unknown integration: ${integrationId}`);
        }

        const connection = connectionByIntegrationId.get(integrationId);

        return {
          requestId: input.requestId,
          integrationId,
          integrationName: integration.name,
          composioConnectionId: connection?.composioConnectionId ?? null,
          connectionStatus: connection?.status ?? null,
          createdAt: Date.now() + index,
        };
      }),
    )
    .returning();

  return inserted;
}

export async function listGenerationRequestIntegrations(
  db: PersistenceDb,
  requestId: string,
) {
  return db.query.generationRequestIntegrations.findMany({
    where: eq(generationRequestIntegrations.requestId, requestId),
    orderBy: [
      asc(generationRequestIntegrations.createdAt),
      asc(generationRequestIntegrations.integrationId),
    ],
  });
}
