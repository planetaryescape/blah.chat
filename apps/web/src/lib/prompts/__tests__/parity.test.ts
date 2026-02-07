import { MEETING_EXTRACTION_PROMPT as packageMeeting } from "@blah-chat/ai/prompts/meetingExtraction";
import { MODEL_TRIAGE_PROMPT as packageTriageModel } from "@blah-chat/ai/prompts/modelTriage";
import {
  DEADLINE_PARSING_PROMPT as packageDeadline,
  TASK_EXTRACTION_PROMPT as packageTask,
} from "@blah-chat/ai/prompts/taskExtraction";
import { TRIAGE_PROMPT as packageTriage } from "@blah-chat/ai/prompts/triage";
import { describe, expect, it } from "vitest";
import { MEETING_EXTRACTION_PROMPT as webMeeting } from "../meetingExtraction";
import { MODEL_TRIAGE_PROMPT as webTriageModel } from "../modelTriage";
import {
  DEADLINE_PARSING_PROMPT as webDeadline,
  TASK_EXTRACTION_PROMPT as webTask,
} from "../taskExtraction";
import { TRIAGE_PROMPT as webTriage } from "../triage";

describe("prompt parity", () => {
  it("re-exports the exact prompt strings from @blah-chat/ai", () => {
    expect(webTask).toBe(packageTask);
    expect(webDeadline).toBe(packageDeadline);
    expect(webMeeting).toBe(packageMeeting);
    expect(webTriageModel).toBe(packageTriageModel);
    expect(webTriage).toBe(packageTriage);
  });
});
