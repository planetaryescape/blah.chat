import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  Client,
  type ClientSession,
  type SessionStreamEvent,
} from "eve/client";
import { z } from "zod";
import { calculateCost } from "../../../packages/ai/src/utils.ts";
import { EVE_SPIKE_TASKS } from "../../../packages/shared/src/prompts/eve-runtime-spike.ts";
import { trialModel } from "../lib/model.ts";

// Intentionally outside agent-work: most of this runner waits on HTTP/workflows.
// Build and typecheck are separate queued commands.
const live = process.env.EVE_SPIKE_LIVE === "1";
const model = trialModel();
if (live && !process.env.AI_GATEWAY_API_KEY) {
  throw new Error("Live mode requires AI_GATEWAY_API_KEY; no call was made");
}
const port = Number(process.env.EVE_SPIKE_PORT ?? 4318);
const baseUrl = `http://127.0.0.1:${port}`;
const token = randomUUID();
const runId = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
const output = `results/${runId}`;
await mkdir(output, { recursive: true });
const client = new Client({ baseUrl, auth: { bearer: token } });
let server: ChildProcess | undefined;
const cases: {
  name: string;
  passed: boolean;
  durationMs: number;
  evidence?: object;
  error?: string;
}[] = [];
const sessions: ClientSession[] = [];

async function stopServer(signal: NodeJS.Signals = "SIGTERM") {
  if (!server?.pid || server.exitCode !== null || server.signalCode !== null)
    return;
  const child = server;
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  // Only the isolated process group this script spawned, never a shared daemon.
  process.kill(-child.pid!, signal);
  await exited;
  server = undefined;
}

async function startServer() {
  // Refuse to accidentally test or kill another process already on this port.
  try {
    await fetch(`${baseUrl}/eve/v1/health`, {
      signal: AbortSignal.timeout(500),
    });
    throw new Error(`Port ${port} is occupied; choose EVE_SPIKE_PORT`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("occupied"))
      throw error;
  }
  server = spawn(
    "node",
    [
      "node_modules/eve/bin/eve.js",
      "start",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        EVE_SPIKE_TOKEN: token,
        EVE_TELEMETRY_DISABLED: "1",
        EVE_CHECK_SESSION_EVENTS: "1",
        WORKFLOW_LOCAL_BASE_URL: baseUrl,
        EVE_LOG_LEVEL: "debug",
      },
    },
  );
  for (const stream of [server.stdout, server.stderr]) {
    stream?.on("data", (chunk) => {
      void appendFile(`${output}/server.log`, chunk);
    });
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(
        `Eve exited with ${server.exitCode}; see ${output}/server.log`,
      );
    try {
      await client.health();
      return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Eve did not become healthy; see ${output}/server.log`);
}

async function check(name: string, run: () => Promise<object>) {
  const start = performance.now();
  try {
    const evidence = await run();
    cases.push({
      name,
      passed: true,
      durationMs: Math.round(performance.now() - start),
      evidence,
    });
    console.log(`PASS ${name}`);
  } catch (error) {
    cases.push({
      name,
      passed: false,
      durationMs: Math.round(performance.now() - start),
      error: String(error),
    });
    console.error(`FAIL ${name}: ${error}`);
  }
}

async function events(session: ClientSession) {
  const snapshot = await session.snapshot({
    signal: AbortSignal.timeout(15_000),
  });
  await writeFile(
    `${output}/${session.id}.json`,
    JSON.stringify(snapshot, null, 2),
  );
  return snapshot.events;
}

async function create(message: string) {
  const created = await client.sessions.create({
    message,
    signal: AbortSignal.timeout(15_000),
  });
  sessions.push(created.session);
  return created;
}

async function waitFor(
  session: ClientSession,
  predicate: (event: SessionStreamEvent) => boolean,
) {
  for await (const event of session.stream({
    startIndex: 0,
    signal: AbortSignal.timeout(20_000),
  })) {
    if (predicate(event)) return event;
  }
  throw new Error("Stream ended without expected event");
}

// Give recovery a longer deadline than an ordinary chat request.
const readOptions = () => ({ signal: AbortSignal.timeout(65_000) });

function settledCalls(log: readonly SessionStreamEvent[], name: string) {
  const ids = new Set(
    log.flatMap((event) =>
      event.type === "call.requested" && event.data.capability.name === name
        ? [event.data.callId]
        : [],
    ),
  );
  return log.filter(
    (event): event is Extract<SessionStreamEvent, { type: "call.settled" }> =>
      event.type === "call.settled" && ids.has(event.data.callId),
  );
}

try {
  await startServer();
  await check("unauthenticated session rejected", async () => {
    const response = await fetch(`${baseUrl}/eve/v1/session`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 401);
    return { status: response.status };
  });

  await check("existing pricing code executes through Eve", async () => {
    const { session, delivery } = await create(EVE_SPIKE_TASKS.cost);
    const result = await delivery.result(readOptions());
    assert.equal(result.status, "completed", JSON.stringify(result));
    const log = await events(session);
    const costCall = settledCalls(log, "quote_cost")[0];
    assert(costCall && costCall.type === "call.settled");
    assert.equal(costCall.data.outcome, "completed");
    const expected = calculateCost(trialModel().id, {
      inputTokens: 1000,
      outputTokens: 200,
    });
    const quote = z.object({ costUsd: z.number() }).parse(costCall.data.output);
    assert.equal(quote.costUsd, expected);
    return {
      sessionId: session.id,
      status: result.status,
      expectedCostUsd: expected,
      reply: result.reply,
    };
  });

  if (!live) {
    await check("stream disconnect and fresh-client replay", async () => {
      const { session, delivery } = await create(EVE_SPIKE_TASKS.stream);
      await waitFor(session, (event) => event.type === "content.delta");
      // Closing a read must not cancel server work. New client has no UI state.
      const resumed = new Client({
        baseUrl,
        auth: { bearer: token },
      }).sessions.attach(session.id);
      const result = await delivery.result(readOptions());
      assert.equal(result.status, "completed");
      const snapshot = await resumed.snapshot(readOptions());
      const completed = snapshot.events.filter(
        (event) => event.type === "content.completed",
      );
      assert(
        completed.some(
          (event) =>
            event.data.value === "Streaming survived the client disconnect.",
        ),
      );
      const cursor = snapshot.session.streamIndex;
      const tail = [];
      for await (const event of resumed.stream({
        startIndex: cursor,
        follow: false,
        ...readOptions(),
      }))
        tail.push(event);
      assert.equal(tail.length, 0);
      await events(session);
      return {
        sessionId: session.id,
        cursor,
        replayEvents: snapshot.events.length,
        eventsAfterCursor: tail.length,
      };
    });

    await check(
      "sandbox filesystem persists across process crash",
      async () => {
        const { session, delivery } = await create(EVE_SPIKE_TASKS.sandbox);
        const written = await delivery.result(readOptions());
        assert.equal(written.status, "completed", JSON.stringify(written));
        assert(written.reply?.includes("sandbox-ok"), JSON.stringify(written));
        await stopServer("SIGKILL");
        await startServer();
        const resumed = client.sessions.attach(session.id);
        const read = await (await resumed.send(EVE_SPIKE_TASKS.read)).result(
          readOptions(),
        );
        assert.equal(read.status, "completed", JSON.stringify(read));
        assert(read.reply?.includes("sandbox-ok"), JSON.stringify(read));
        await events(resumed);
        return { sessionId: session.id, replyAfterCrash: read.reply };
      },
    );

    await check(
      "approval survives crash and duplicate delivery is deduplicated",
      async () => {
        const { session, delivery } = await create(EVE_SPIKE_TASKS.approve);
        const paused = await delivery.result(readOptions());
        assert.equal(paused.status, "awaiting-input", JSON.stringify(paused));
        const before = await events(session);
        assert(
          !settledCalls(before, "record_decision").some(
            (event) => event.data.outcome === "completed",
          ),
        );
        assert.equal(paused.interactions.length, 1);
        await stopServer("SIGKILL");
        await startServer();
        const resumed = client.sessions.attach(session.id);
        const payload = {
          answers: [
            {
              interactionId: paused.interactions[0]!.interactionId,
              optionId: "approve",
            },
          ],
          idempotencyKey: randomUUID(),
        };
        const post = () =>
          fetch(`${baseUrl}/eve/v1/session/${session.id}`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10_000),
          });
        const first = await post();
        assert(first.ok, await first.text());
        const duplicate = await post();
        assert(duplicate.ok, await duplicate.text());
        await waitFor(resumed, (event) => event.type === "turn.settled");
        const log = await events(resumed);
        const writes = settledCalls(log, "record_decision").filter(
          (event) => event.data.outcome === "completed",
        );
        assert.equal(writes.length, 1);
        assert.deepEqual(writes[0]?.data.output, {
          recorded: true,
          duplicate: false,
          path: "/workspace/decision-1.json",
        });
        return {
          sessionId: session.id,
          pendingApprovalsBeforeCrash: paused.interactions.length,
          executionsAfterDuplicateApproval: writes.length,
          call: writes[0],
        };
      },
    );

    await check("approval rejection does not execute write", async () => {
      const { session, delivery } = await create(EVE_SPIKE_TASKS.approve);
      const paused = await delivery.result(readOptions());
      assert.equal(paused.status, "awaiting-input");
      const cancelOption = paused.interactions[0]!.request.options?.find(
        (option) => option.id !== "approve",
      );
      assert(cancelOption, JSON.stringify(paused.interactions));
      const result = await (
        await session.respond([
          {
            interactionId: paused.interactions[0]!.interactionId,
            optionId: cancelOption.id,
          },
        ])
      ).result(readOptions());
      assert(
        ["completed", "cancelled"].includes(result.status),
        JSON.stringify(result),
      );
      const log = await events(session);
      const writes = settledCalls(log, "record_decision");
      assert.equal(writes.length, 1);
      assert(
        writes.every((event) =>
          ["rejected", "interrupted"].includes(event.data.outcome),
        ),
      );
      return { sessionId: session.id, calls: writes };
    });

    await check(
      "active tool cancellation reaches terminal cancelled state",
      async () => {
        const { session, delivery } = await create(EVE_SPIKE_TASKS.slow);
        const started = await waitFor(
          session,
          (event) => event.type === "call.started",
        );
        assert.equal(started.type, "call.started");
        const turn = await waitFor(
          session,
          (event) => event.type === "turn.started",
        );
        assert(turn.type === "turn.started");
        await (await session.cancel({ turnId: turn.data.turnId })).result(
          readOptions(),
        );
        const result = await delivery.result(readOptions());
        assert.equal(result.status, "cancelled", JSON.stringify(result));
        await events(session);
        return { sessionId: session.id, status: result.status };
      },
    );

    await check(
      "crash during active tool resumes without silently repeating it",
      async () => {
        const { session, delivery } = await create(EVE_SPIKE_TASKS.slow);
        await waitFor(session, (event) => event.type === "call.started");
        await stopServer("SIGKILL");
        await startServer();
        const result = await delivery.result(readOptions());
        assert.equal(result.status, "completed", JSON.stringify(result));
        const log = await events(session);
        const calls = log.filter(
          (event) =>
            event.type === "call.requested" &&
            event.data.capability.name === "slow_probe",
        );
        assert.equal(calls.length, 1);
        return {
          sessionId: session.id,
          status: result.status,
          calls: calls.length,
          reply: result.reply,
        };
      },
    );
  }

  await check(
    "per-model-call usage reaches local accounting sink",
    async () => {
      const records = (await readFile("results/usage.jsonl", "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const currentIds = new Set(sessions.map((session) => session.id));
      const current = records.filter((record) =>
        currentIds.has(record.sessionId),
      );
      const completed = current.filter(
        (record) => record.outcome === "completed",
      );
      assert(completed.length >= 2);
      assert(
        completed.every(
          (record) =>
            record.usage.inputTokens > 0 && record.usage.outputTokens > 0,
        ),
      );
      assert(
        completed.every(
          (record) =>
            z.number().nonnegative().safeParse(record.estimatedCostUsd).success,
        ),
      );
      const keys = new Set(completed.map((record) => record.idempotencyKey));
      return {
        completedCalls: completed.length,
        uniqueAccountingKeys: keys.size,
        synthetic: !live,
        records: current,
      };
    },
  );
} finally {
  // End trial sessions before stopping the process; preserve evidence on disk.
  if (server) {
    for (const session of sessions) {
      try {
        await events(session);
      } catch {
        /* A broken stream is evidence too. */
      }
      try {
        await (
          await session.end({
            reason: "Trial complete",
            signal: AbortSignal.timeout(2000),
          })
        ).result({ signal: AbortSignal.timeout(2000) });
      } catch {
        /* Preserve failure evidence. */
      }
    }
  }
  await stopServer();
  const summary = {
    runId,
    eveVersion: "1.0.0-rc.1",
    mode: live ? "live" : "scripted-v3-model",
    modelId: model.id,
    cases,
  };
  await writeFile(`${output}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(`Evidence: ${output}/summary.json`);
}
if (cases.some((test) => !test.passed)) process.exitCode = 1;
