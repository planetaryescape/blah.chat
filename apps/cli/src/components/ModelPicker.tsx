import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { listModels, type Model } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { Spinner } from "./Spinner.js";

interface ModelPickerProps {
  currentModel?: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

export function ModelPicker(props: ModelPickerProps) {
  const [models, setModels] = createSignal<Model[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load models
  createEffect(() => {
    (async () => {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const modelList = await listModels(client, apiKey);
        if (modelList) {
          setModels(modelList);
          if (props.currentModel) {
            const idx = modelList.findIndex((m) => m.id === props.currentModel);
            if (idx >= 0) setSelectedIndex(idx);
          }
        }
      } catch (err) {
        setError(formatError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  });

  useKeyboard((evt) => {
    if (isLoading()) return;

    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, models().length - 1));
      return;
    }
    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (evt.name === "pagedown") {
      evt.preventDefault();
      setSelectedIndex((i) => Math.min(i + 5, models().length - 1));
      return;
    }
    if (evt.name === "pageup") {
      evt.preventDefault();
      setSelectedIndex((i) => Math.max(i - 5, 0));
      return;
    }
    if (evt.name === "g" && !evt.shift) {
      evt.preventDefault();
      setSelectedIndex(0);
      return;
    }
    if (evt.shift && evt.name === "g") {
      evt.preventDefault();
      setSelectedIndex(models().length - 1);
      return;
    }
    if (evt.name === "return") {
      evt.preventDefault();
      const selected = models()[selectedIndex()];
      if (selected) props.onSelect(selected.id);
      return;
    }
    if (evt.name === "escape" || evt.name === "q") {
      evt.preventDefault();
      props.onCancel();
      return;
    }
  });

  // Window calculations
  const windowSize = 10;
  const startIndex = createMemo(() => {
    const half = Math.floor(windowSize / 2);
    return Math.max(0, selectedIndex() - half);
  });
  const endIndex = createMemo(() =>
    Math.min(models().length, startIndex() + windowSize),
  );
  const visibleModels = createMemo(() =>
    models().slice(startIndex(), endIndex()),
  );

  return (
    <box flexDirection="column" padding={1}>
      <Show when={isLoading()}>
        <Spinner label="Loading models..." />
      </Show>

      <Show when={error()}>
        <box>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
        <box marginTop={1}>
          <text fg="gray">Press Escape to go back</text>
        </box>
      </Show>

      <Show when={!isLoading() && !error()}>
        {/* Header */}
        <box
          marginBottom={1}
          style={{ border: true, borderColor: "cyan" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="cyan" attributes={1}>
            Select Model
          </text>
          <box flexGrow={1} />
          <text fg="gray">({models().length} available)</text>
        </box>

        <Show when={props.currentModel}>
          <box marginBottom={1} paddingLeft={1}>
            <text fg="gray">Current: </text>
            <text fg="yellow">{props.currentModel}</text>
          </box>
        </Show>

        <Show when={startIndex() > 0}>
          <box justifyContent="center">
            <text fg="gray">
              {symbols.arrowUp} {startIndex()} more
            </text>
          </box>
        </Show>

        <box flexDirection="column">
          <For each={visibleModels()}>
            {(model, i) => {
              const actualIndex = () => startIndex() + i();
              const isSelected = () => actualIndex() === selectedIndex();
              const isCurrent = () => model.id === props.currentModel;
              return (
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  style={
                    isSelected() ? { border: true, borderColor: "cyan" } : {}
                  }
                >
                  <text fg={isSelected() ? "cyan" : "gray"}>
                    {isSelected() ? symbols.chevronRight : " "}
                  </text>
                  <text> </text>
                  <text fg={isCurrent() ? "green" : undefined}>
                    {isCurrent() ? symbols.active : symbols.pending}
                  </text>
                  <text> </text>
                  <box flexGrow={1}>
                    <text
                      fg={isSelected() ? "cyan" : undefined}
                      attributes={isSelected() ? 1 : 0}
                    >
                      {model.name}
                    </text>
                  </box>
                  <text fg="gray">{model.provider}</text>
                  <Show when={model.isPro}>
                    <text fg="yellow"> {symbols.star}</text>
                  </Show>
                </box>
              );
            }}
          </For>
        </box>

        <Show when={endIndex() < models().length}>
          <box justifyContent="center">
            <text fg="gray">
              {symbols.arrowDown} {models().length - endIndex()} more
            </text>
          </box>
        </Show>

        <box
          marginTop={1}
          style={{ border: true, borderColor: "gray" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="gray">
            {symbols.chevronRight} {"\u2191\u2193"}/jk nav | Enter select | q
            cancel
          </text>
        </box>
      </Show>
    </box>
  );
}
