import { appendFile, mkdir } from "node:fs/promises";
import { defineInstrumentation } from "eve/instrumentation";
import { calculateCost } from "../../../../packages/ai/src/utils.ts";
import { trialModel } from "../../lib/model.ts";

export default defineInstrumentation({
  tracePolicy: () => ({
    emit: true,
    recordInputs: false,
    recordOutputs: false,
  }),
  events: {
    async "model.call.settled"(event) {
      await mkdir("results", { recursive: true });
      const base = {
        idempotencyKey: event.idempotencyKey,
        sessionId: event.scope.sessionId,
        outcome: event.outcome,
        synthetic: process.env.EVE_SPIKE_LIVE !== "1",
      };
      const record =
        event.outcome === "completed"
          ? {
              ...base,
              usage: event.usage,
              estimatedCostUsd: calculateCost(trialModel().id, {
                inputTokens: event.usage.inputTokens ?? 0,
                outputTokens: event.usage.outputTokens ?? 0,
              }),
            }
          : base;
      // Local evidence only. Production must upsert by idempotencyKey.
      await appendFile("results/usage.jsonl", `${JSON.stringify(record)}\n`);
    },
  },
});
