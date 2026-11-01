// Throwaway trial prompts. Not used by production generation.
export const EVE_SPIKE_INSTRUCTIONS = `You are testing blah.chat's agent runtime.
Use quote_cost for model pricing. Use record_decision only when asked to record a
decision; it requires approval. Use bash for workspace shell tasks. Never access
real user data or external services. Report tool results accurately and briefly.`;

export const EVE_SPIKE_TASKS = {
  cost: "SPIKE:cost Quote the cost of 1000 input and 200 output tokens using quote_cost.",
  approve:
    "SPIKE:approve Record the decision 'Evaluate Eve behind an adapter' using record_decision with operationId 'decision-1'.",
  sandbox:
    "SPIKE:sandbox Use bash to write 'sandbox-ok' to /workspace/probe.txt and read it back.",
  read: "SPIKE:read Use bash to read /workspace/probe.txt.",
  slow: "SPIKE:slow Call slow_probe to start a cancellable operation.",
  stream:
    "SPIKE:stream Reply with a short message streamed in multiple chunks.",
} as const;
