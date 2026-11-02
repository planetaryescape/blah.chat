import { afterEach, describe, expect, mock, test } from "bun:test";
import { getTtsVoiceLabel, TTS_VOICE_OPTIONS } from "@blah-chat/shared/tts";
import { getFunctionName } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getMobileTransportError,
  getMobileTransportMode,
} from "../lib/transport/mode";
import { formatToolResult, parseToolValue } from "../lib/utils/toolJson";

const originalMode = process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;
afterEach(() => {
  if (originalMode === undefined)
    delete process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;
  else process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = originalMode;
});

describe("one mobile backend", () => {
  test("default and explicit Convex use the same backend", () => {
    delete process.env.EXPO_PUBLIC_MOBILE_TRANSPORT;
    expect(getMobileTransportMode()).toBe("convex");
    process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = " CONVEX ";
    expect(getMobileTransportMode()).toBe("convex");
  });
  for (const mode of ["http", "http-sse", "sse", "typo"]) {
    test(`rejects ${mode} rather than silently writing to Convex`, () => {
      process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = mode;
      expect(getMobileTransportError()).toContain("not supported");
      expect(getMobileTransportMode).toThrow("not supported");
    });
  }
});

describe("native and legacy tool JSON", () => {
  test.each([
    [{ answer: 42 }, '{\n  "answer": 42\n}'],
    ['{"answer":42}', '{\n  "answer": 42\n}'],
    ["plain markdown", "plain markdown"],
    ['"quoted text"', "quoted text"],
    [false, "false"],
    [0, "0"],
    [null, null],
    [undefined, null],
  ])("renders %j as text", (input, expected) => {
    expect(formatToolResult(input)).toBe(expected);
  });
  test("native args and JSON strings retain their fields", () => {
    expect(parseToolValue({ query: "hello" })).toEqual({ query: "hello" });
    expect(parseToolValue('{"query":"hello"}')).toEqual({ query: "hello" });
  });
});

test("restored voice catalog includes the stored default and all existing voices", () => {
  expect(TTS_VOICE_OPTIONS.map((voice) => voice.value).sort()).toEqual(
    [
      "aura-2-amalthea-en",
      "aura-2-andromeda-en",
      "aura-angus-en",
      "aura-2-apollo-en",
      "aura-arcas-en",
      "aura-2-aries-en",
      "aura-asteria-en",
      "aura-athena-en",
      "aura-2-atlas-en",
      "aura-2-aurora-en",
      "aura-2-callista-en",
      "aura-2-cora-en",
      "aura-2-cordelia-en",
      "aura-2-delia-en",
      "aura-2-draco-en",
      "aura-2-electra-en",
      "aura-2-harmonia-en",
      "aura-2-helena-en",
      "aura-helios-en",
      "aura-hera-en",
      "aura-2-hermes-en",
      "aura-2-hyperion-en",
      "aura-2-iris-en",
      "aura-2-janus-en",
      "aura-2-juno-en",
      "aura-2-jupiter-en",
      "aura-luna-en",
      "aura-2-mars-en",
      "aura-2-minerva-en",
      "aura-2-neptune-en",
      "aura-2-odysseus-en",
      "aura-2-ophelia-en",
      "aura-orion-en",
      "aura-orpheus-en",
      "aura-2-pandora-en",
      "aura-perseus-en",
      "aura-2-phoebe-en",
      "aura-2-pluto-en",
      "aura-2-saturn-en",
      "aura-2-selene-en",
      "aura-stella-en",
      "aura-2-thalia-en",
      "aura-2-theia-en",
      "aura-2-vesta-en",
      "aura-zeus-en",
    ].sort(),
  );
  expect(
    TTS_VOICE_OPTIONS.find((voice) => voice.value === "aura-asteria-en")?.label,
  ).toBe("Asteria (Female, warm)");
  expect(new Set(TTS_VOICE_OPTIONS.map((voice) => voice.value)).size).toBe(45);
});

test("unknown persisted voices retain a readable fallback label", () => {
  expect(getTtsVoiceLabel("aura-custom-en")).toBe("custom");
  expect(getTtsVoiceLabel("aura-2-future-en")).toBe("future");
  expect(getTtsVoiceLabel("other-provider-voice")).toBe("other-provider-voice");
});

let queryResult = new Error("Not authenticated");
const refresh = mock(async () => undefined);
const actionNames = [];
const mutationNames = [];
const writes = [];
mock.module("convex/react", () => ({
  useQueries: () => ({ suggestions: queryResult }),
  useAction: (reference) => {
    actionNames.push(getFunctionName(reference));
    return refresh;
  },
  useMutation: (reference) => {
    const name = getFunctionName(reference);
    mutationNames.push(name);
    return mock(async (args) => {
      writes.push({ name, args });
    });
  },
}));
mock.module("burnt", () => ({ toast: mock(() => undefined) }));
mock.module("expo-av", () => ({ Audio: {} }));
mock.module("@clerk/clerk-expo", () => ({
  useAuth: () => ({ getToken: async () => "synthetic-token" }),
}));
mock.module("@tanstack/react-query", () => ({
  useMutation: () => ({
    mutateAsync: () => {
      throw new Error("Unexpected HTTP write");
    },
  }),
}));
mock.module("../lib/cache/queryClient", () => ({
  queryClient: { invalidateQueries: mock(() => undefined) },
}));

const { useStarterSuggestions } = await import(
  "../lib/hooks/useStarterSuggestions"
);
const { useAsyncAction } = await import("../lib/hooks/useAsyncAction");
const { useUpdatePreference } = await import(
  "../lib/hooks/useUpdatePreference"
);
const { useChatSTT } = await import("../lib/hooks/useChatSTT");
const { useChatAttachmentUpload } = await import(
  "../lib/hooks/useChatAttachmentUpload"
);
const {
  useDeleteMessage,
  useEditMessage,
  useRegenerateMessage,
  useBranchMessage,
  useSwitchBranch,
} = await import("../lib/hooks/useMessageActions");

test("starter query auth and network errors render emergency prompts without throwing", () => {
  for (const result of [
    new Error("Not authenticated"),
    new Error("Network unavailable"),
    undefined,
  ]) {
    queryResult = result;
    function Suggestions() {
      const suggestions = useStarterSuggestions();
      expect(suggestions.visibleSuggestions).toHaveLength(3);
      expect(suggestions.source).toBe("fallback");
      expect(suggestions.isLoading).toBe(result === undefined);
      return <span>{suggestions.visibleSuggestions[0].text}</span>;
    }
    expect(() => renderToStaticMarkup(<Suggestions />)).not.toThrow();
  }
  expect(refresh).not.toHaveBeenCalled();
});

test("handled async mutation failures provide feedback and permit retry", async () => {
  let attempts = 0;
  const mutation = mock(async () => {
    if (++attempts === 1) throw new Error("offline");
    return true;
  });
  const onError = mock(() => undefined);
  let run;
  function Harness() {
    run = useAsyncAction(mutation, { onError }).run;
    return null;
  }
  renderToStaticMarkup(<Harness />);
  expect(await run?.()).toBeUndefined();
  expect(onError).toHaveBeenCalledTimes(1);
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(await run?.()).toBe(true);
  expect(onError).toHaveBeenCalledTimes(1);
});

test("voice and attachment upload cannot bypass the selected backend", () => {
  actionNames.length = 0;
  mutationNames.length = 0;
  process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "convex";
  function Voice() {
    useChatSTT(true);
    useChatAttachmentUpload();
    return null;
  }
  renderToStaticMarkup(<Voice />);
  expect(actionNames).toEqual(["transcription:transcribeAudio"]);
  expect(mutationNames).toEqual([
    "files:generateUploadUrl",
    "files:generateUploadUrl",
    "files:saveFile",
  ]);
  actionNames.length = 0;
  mutationNames.length = 0;
  process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "http";
  expect(() => renderToStaticMarkup(<Voice />)).toThrow("not supported");
  expect(actionNames).toEqual([]);
  expect(mutationNames).toEqual([]);
});

test("selecting an existing voice persists the exact configured voice on Convex", async () => {
  process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "convex";
  writes.length = 0;
  let updatePreference;
  function Settings() {
    updatePreference = useUpdatePreference();
    return null;
  }
  renderToStaticMarkup(<Settings />);
  await updatePreference("ttsVoice", "aura-2-andromeda-en");
  expect(writes).toEqual([
    {
      name: "users:updatePreferences",
      args: { preferences: { ttsVoice: "aura-2-andromeda-en" } },
    },
  ]);
});

test("message actions register only the selected Convex functions", () => {
  process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "convex";
  mutationNames.length = 0;
  function Actions() {
    useDeleteMessage();
    useEditMessage();
    useRegenerateMessage();
    useBranchMessage();
    useSwitchBranch();
    return null;
  }
  renderToStaticMarkup(<Actions />);
  expect(mutationNames).toEqual([
    "chat:deleteMessage",
    "chat:editMessage",
    "chat:regenerate",
    "chat:branchFromMessage",
    "chat:switchBranch",
  ]);
  mutationNames.length = 0;
  process.env.EXPO_PUBLIC_MOBILE_TRANSPORT = "http";
  expect(() => renderToStaticMarkup(<Actions />)).toThrow("not supported");
  expect(mutationNames).toEqual([]);
});
