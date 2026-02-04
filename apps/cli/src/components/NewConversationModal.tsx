import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { createConversation } from "../lib/mutations.js";
import { listModels, type Model } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { Spinner } from "./Spinner.js";

interface NewConversationModalProps {
  onCreated: (conversationId: Id<"conversations">) => void;
  onCancel: () => void;
}

type Step = "title" | "model" | "creating";

export function NewConversationModal(props: NewConversationModalProps) {
  const [step, setStep] = createSignal<Step>("title");
  const [title, setTitle] = createSignal("");
  const [models, setModels] = createSignal<Model[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);

  // Load models
  createEffect(() => {
    (async () => {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const modelList = await listModels(client, apiKey);
        if (modelList) setModels(modelList);
      } catch (err) {
        setError(formatError(err));
      }
    })();
  });

  const handleCreate = async () => {
    setStep("creating");
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      const selectedModel = models()[selectedModelIndex()];
      const result = await createConversation(client, apiKey, {
        title: title().trim() || undefined,
        model: selectedModel?.id,
      });
      props.onCreated(result.conversationId);
    } catch (err) {
      setError(formatError(err));
      setStep("model");
    }
  };

  useKeyboard((evt) => {
    if (step() === "title") {
      if (evt.name === "return") {
        evt.preventDefault();
        setStep("model");
        return;
      }
      if (evt.name === "escape") {
        evt.preventDefault();
        props.onCancel();
        return;
      }
    }

    if (step() === "model") {
      if (evt.name === "down" || evt.name === "j") {
        evt.preventDefault();
        setSelectedModelIndex((i) => Math.min(i + 1, models().length - 1));
        return;
      }
      if (evt.name === "up" || evt.name === "k") {
        evt.preventDefault();
        setSelectedModelIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (evt.name === "return") {
        evt.preventDefault();
        handleCreate();
        return;
      }
      if (evt.name === "escape" || evt.name === "b") {
        evt.preventDefault();
        setStep("title");
        return;
      }
      if (evt.name === "q") {
        evt.preventDefault();
        props.onCancel();
        return;
      }
    }
  });

  // Window calculations for model list
  const windowSize = 8;
  const startIndex = createMemo(() => {
    const half = Math.floor(windowSize / 2);
    return Math.max(0, selectedModelIndex() - half);
  });
  const endIndex = createMemo(() =>
    Math.min(models().length, startIndex() + windowSize),
  );
  const visibleModels = createMemo(() =>
    models().slice(startIndex(), endIndex()),
  );

  return (
    <box flexDirection="column" padding={1}>
      <Show when={error()}>
        <box>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
        <box marginTop={1}>
          <text fg="gray">Press any key to go back</text>
        </box>
      </Show>

      <Show when={step() === "creating"}>
        <Spinner label="Creating conversation..." />
      </Show>

      <Show when={step() === "title" && !error()}>
        <box
          marginBottom={1}
          style={{ border: true, borderColor: "cyan" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="cyan" attributes={1}>
            New Conversation
          </text>
        </box>

        <box marginBottom={1}>
          <text>Title (optional): </text>
          <input
            onInput={(e: string) => setTitle(e)}
            placeholder="Untitled"
            ref={(r: any) => {
              setTimeout(() => {
                if (r && !r.isDestroyed) r.focus();
              }, 1);
            }}
          />
        </box>

        <box marginTop={1}>
          <text fg="gray">Enter to continue | Escape to cancel</text>
        </box>
      </Show>

      <Show when={step() === "model" && !error()}>
        <box
          marginBottom={1}
          style={{ border: true, borderColor: "cyan" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="cyan" attributes={1}>
            Select Model
          </text>
        </box>

        <box marginBottom={1} paddingLeft={1}>
          <text fg="gray">Title: </text>
          <text>{title().trim() || "Untitled"}</text>
        </box>

        <box justifyContent="center">
          <text fg="gray">
            {startIndex() > 0 ? `${symbols.arrowUp} ${startIndex()} more` : " "}
          </text>
        </box>

        <box flexDirection="column">
          <For each={visibleModels()}>
            {(model, i) => {
              const actualIndex = () => startIndex() + i();
              const isSelected = () => actualIndex() === selectedModelIndex();
              return (
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={isSelected() ? "cyan" : undefined}
                >
                  <box flexGrow={1}>
                    <text
                      fg={isSelected() ? "black" : undefined}
                      attributes={isSelected() ? 1 : 0}
                    >
                      {model.name}
                    </text>
                  </box>
                  <text fg={isSelected() ? "black" : "gray"}>
                    {model.provider}
                  </text>
                  <Show when={model.isPro}>
                    <text fg={isSelected() ? "black" : "yellow"}>
                      {" "}
                      {symbols.star}
                    </text>
                  </Show>
                </box>
              );
            }}
          </For>
        </box>

        <box justifyContent="center">
          <text fg="gray">
            {endIndex() < models().length
              ? `${symbols.arrowDown} ${models().length - endIndex()} more`
              : " "}
          </text>
        </box>

        <box
          marginTop={1}
          style={{ border: true, borderColor: "gray" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="gray">
            {symbols.chevronRight} {"\u2191\u2193"}/jk select | Enter create | b
            back | q cancel
          </text>
        </box>
      </Show>
    </box>
  );
}
