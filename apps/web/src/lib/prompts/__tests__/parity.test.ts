import { DEADLINE_PARSING_PROMPT as packageDeadline } from "@blah-chat/ai/prompts/deadlineParsing";
import { MODEL_TRIAGE_PROMPT as packageTriageModel } from "@blah-chat/ai/prompts/modelTriage";
import { TRIAGE_PROMPT as packageTriage } from "@blah-chat/ai/prompts/triage";
import { describe, expect, it } from "vitest";
import { DEADLINE_PARSING_PROMPT as webDeadline } from "../deadlineParsing";
import { MODEL_TRIAGE_PROMPT as webTriageModel } from "../modelTriage";
import { TRIAGE_PROMPT as webTriage } from "../triage";

describe("prompt parity", () => {
  it("re-exports the exact prompt strings from @blah-chat/ai", () => {
    expect(webDeadline).toBe(packageDeadline);
    expect(webTriageModel).toBe(packageTriageModel);
    expect(webTriage).toBe(packageTriage);
  });
});
