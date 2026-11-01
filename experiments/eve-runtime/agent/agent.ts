import { defineAgent, defineDynamic } from "eve";
import { trialModel } from "../lib/model.ts";
import { scriptedModel } from "../lib/scripted-model.ts";

export default defineAgent({
  model: defineDynamic(() => {
    const model = trialModel();
    return {
      model:
        process.env.EVE_SPIKE_LIVE === "1"
          ? model.id.replace(":", "/")
          : scriptedModel(),
      modelContextWindowTokens: model.contextWindow,
    };
  }),
  limits: {
    sessionTimeoutMs: 60 * 60 * 1000,
    sessionUsage: ({ total }) => total.outputTokens >= 4000,
  },
  experimental: { workflow: { retention: "default" } },
});
