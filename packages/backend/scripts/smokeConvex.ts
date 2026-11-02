/**
 * Opt-in live backend smoke. Uses admin impersonation, not a Clerk browser login.
 * Supply CONVEX_DEPLOY_KEY, NEXT_PUBLIC_CONVEX_URL and SMOKE_CLERK_ID privately.
 * Only conversations created by this run are deleted; billed usage is retained.
 */

import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

if (!process.argv.includes("--run")) {
  throw new Error("Live smoke requires --run (performs paid generation)");
}
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const key = process.env.CONVEX_DEPLOY_KEY;
const subject = process.env.SMOKE_CLERK_ID;
if (!url || !key || !subject)
  throw new Error("Missing private smoke configuration");

function connect() {
  const client = new ConvexHttpClient(url!);
  // This is the same explicitly internal API used by the Convex CLI's --identity.
  const admin = client as ConvexHttpClient & {
    setAdminAuth(
      key: string,
      identity: { subject: string; issuer: string },
    ): void;
  };
  admin.setAdminAuth(key!, {
    subject: subject!,
    issuer: "https://clerk.blah.chat",
  });
  return client;
}

type Message = {
  _id: string;
  role: string;
  status: string;
  content: string;
  parentMessageId?: string;
};
type SendResult = {
  conversationId: string;
  userMessageId: string;
  assistantMessageIds: string[];
};
const create = makeFunctionReference<
  "mutation",
  { model: string; title: string },
  string
>("conversations:create");
const remove = makeFunctionReference<
  "mutation",
  { conversationId: string },
  unknown
>("conversations:deleteConversation");
const list = makeFunctionReference<
  "query",
  { conversationId: string },
  Message[]
>("messages:list");
const send = makeFunctionReference<
  "mutation",
  {
    conversationId: string;
    content: string;
    modelId?: string;
    models?: string[];
  },
  SendResult
>("chat:sendMessage");
const regenerate = makeFunctionReference<
  "mutation",
  { messageId: string; modelId: string },
  string
>("chat:regenerate");
const stop = makeFunctionReference<
  "mutation",
  { conversationId: string },
  unknown
>("chat:stopGeneration");

async function waitForMessages(conversationId: string, ids: string[]) {
  const deadline = Date.now() + 120_000;
  // Reconnect for every read: generation must not depend on a surviving client.
  while (Date.now() < deadline) {
    const rows = await connect().query(list, { conversationId });
    const found = ids.map((id) => rows.find((row) => row._id === id));
    if (found.some((row) => row?.status === "error"))
      throw new Error("Live generation failed");
    if (
      found.every(
        (row) =>
          row && row.status === "complete" && row.content.trim().length > 0,
      )
    )
      return rows;
    await Bun.sleep(500);
  }
  throw new Error("Live generation did not complete before deadline");
}

const client = connect();
const created: string[] = [];
const checks: string[] = [];
try {
  const conversationId = await client.mutation(create, {
    model: DEFAULT_MODEL_ID,
    title: `Convex cutover smoke ${new Date().toISOString()}`,
  });
  created.push(conversationId);
  const sent = await client.mutation(send, {
    conversationId,
    content: "Reply with exactly: durable Convex generation works.",
    modelId: DEFAULT_MODEL_ID,
  });
  const messages = await waitForMessages(
    conversationId,
    sent.assistantMessageIds,
  );
  if (!messages.some((m) => m._id === sent.userMessageId && m.role === "user"))
    throw new Error("User message missing");
  checks.push("create", "send", "durable response after client reconnect");

  const branch = await client.mutation(regenerate, {
    messageId: sent.assistantMessageIds[0],
    modelId: DEFAULT_MODEL_ID,
  });
  const branched = await waitForMessages(conversationId, [branch]);
  if (
    !branched.some((m) => m._id === sent.assistantMessageIds[0]) ||
    branch === sent.assistantMessageIds[0]
  )
    throw new Error("Regeneration replaced history");
  checks.push("regeneration preserves original branch");

  const second = Object.values(MODEL_CONFIG).find(
    (m) => m.id !== DEFAULT_MODEL_ID && m.hostOrder?.includes("groq"),
  );
  if (!second)
    throw new Error("No direct-provider comparison model configured");
  const comparisonId = await client.mutation(create, {
    model: DEFAULT_MODEL_ID,
    title: "Convex cutover comparison smoke",
  });
  created.push(comparisonId);
  const comparison = await client.mutation(send, {
    conversationId: comparisonId,
    content: "Reply with exactly: comparison works.",
    models: [DEFAULT_MODEL_ID, second.id],
  });
  if (comparison.assistantMessageIds.length !== 2)
    throw new Error("Comparison did not schedule two responses");
  await waitForMessages(comparisonId, comparison.assistantMessageIds);
  checks.push("two-model comparison");

  const stoppingId = await client.mutation(create, {
    model: DEFAULT_MODEL_ID,
    title: "Convex cutover stop smoke",
  });
  created.push(stoppingId);
  await client.mutation(send, {
    conversationId: stoppingId,
    content:
      "Write a detailed list of 500 numbered practical software testing techniques.",
    modelId: DEFAULT_MODEL_ID,
  });
  await client.mutation(stop, { conversationId: stoppingId });
  const stopped = await connect().query(list, { conversationId: stoppingId });
  if (
    stopped.some(
      (m) =>
        m.role === "assistant" && ["pending", "generating"].includes(m.status),
    )
  )
    throw new Error("Stop left an active generation");
  checks.push("stop");
  console.log(
    JSON.stringify({
      passed: checks,
      authentication: "Convex admin impersonation; not a browser Clerk login",
    }),
  );
} finally {
  for (const conversationId of created) {
    await client.mutation(stop, { conversationId }).catch(() => undefined);
    await client.mutation(remove, { conversationId });
  }
}
