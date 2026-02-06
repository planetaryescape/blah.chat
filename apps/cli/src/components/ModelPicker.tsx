import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useFuzzySearch } from "../hooks/useFuzzySearch.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { listModels, type Model } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { Spinner } from "./Spinner.js";

interface ModelPickerProps {
  currentModel?: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

type DisplayItem =
  | { type: "header"; provider: string }
  | { type: "model"; model: Model };

export function ModelPicker(props: ModelPickerProps) {
  const [models, setModels] = createSignal<Model[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const { setQuery, results, isSearching } = useFuzzySearch({
    items: models,
    getSearchText: (m) => `${m.name} ${m.provider}`,
  });

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
      } finally {
        setIsLoading(false);
      }
    })();
  });

  // Reset selection when results change
  createEffect(() => {
    results();
    setSelectedIndex(0);
  });

  // Build display list: grouped with headers when not searching, flat when searching
  const displayItems = createMemo<DisplayItem[]>(() => {
    const r = results();
    if (isSearching()) {
      return r.map((model) => ({ type: "model" as const, model }));
    }

    // Group by provider, current model's provider first
    const grouped = new Map<string, Model[]>();
    for (const model of r) {
      const existing = grouped.get(model.provider);
      if (existing) existing.push(model);
      else grouped.set(model.provider, [model]);
    }

    const currentProvider = props.currentModel?.split(":")[0]?.toLowerCase();
    const providers = [...grouped.keys()].sort((a, b) => {
      const aMatch = currentProvider && a.toLowerCase() === currentProvider;
      const bMatch = currentProvider && b.toLowerCase() === currentProvider;
      if (aMatch && !bMatch) return -1;
      if (bMatch && !aMatch) return 1;
      return a.localeCompare(b);
    });

    const items: DisplayItem[] = [];
    for (const provider of providers) {
      items.push({ type: "header", provider });
      for (const model of grouped.get(provider)!) {
        items.push({ type: "model", model });
      }
    }
    return items;
  });

  // Indices of navigable (model) items within displayItems
  const navigableIndices = createMemo(() =>
    displayItems()
      .map((item, i) => (item.type === "model" ? i : -1))
      .filter((i) => i !== -1),
  );

  // Map selectedIndex (into navigable list) to actual displayItems index
  const selectedDisplayIndex = createMemo(() => {
    const indices = navigableIndices();
    const idx = selectedIndex();
    return indices[Math.min(idx, indices.length - 1)] ?? -1;
  });

  useKeyboard((evt) => {
    if (isLoading()) return;

    const maxNav = navigableIndices().length - 1;

    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, maxNav));
      return;
    }
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (evt.name === "return") {
      evt.preventDefault();
      const dispIdx = selectedDisplayIndex();
      const item = displayItems()[dispIdx];
      if (item?.type === "model") props.onSelect(item.model.id);
      return;
    }
    if (evt.name === "escape") {
      evt.preventDefault();
      props.onCancel();
      return;
    }
  });

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
          <text fg="#a1a1aa">Press Escape to go back</text>
        </box>
      </Show>

      <Show when={!isLoading() && !error()}>
        {/* Header */}
        <box paddingLeft={4} paddingRight={4}>
          <text fg="#808080">{`(${results().length} available)`}</text>
          <box flexGrow={1} />
          <text fg="#808080">esc</text>
        </box>

        {/* Search input */}
        <box marginBottom={1} paddingLeft={4}>
          <input
            onInput={(e: string) => setQuery(e)}
            placeholder="Type to search..."
            ref={(r: any) => {
              setTimeout(() => {
                if (r && !r.isDestroyed) r.focus();
              }, 1);
            }}
          />
        </box>

        <Show when={props.currentModel}>
          <box marginBottom={1} paddingLeft={2}>
            <text fg="#fab283">{props.currentModel}</text>
          </box>
        </Show>

        {/* Model list */}
        <Show
          when={navigableIndices().length > 0}
          fallback={
            <box paddingLeft={1}>
              <text fg="#a1a1aa">
                {isSearching() ? "No matches found" : "No models available"}
              </text>
            </box>
          }
        >
          <scrollbox flexGrow={1}>
            <For each={displayItems()}>
              {(item, i) => {
                if (item.type === "header") {
                  return (
                    <box paddingLeft={2} marginTop={i() > 0 ? 1 : 0}>
                      <text fg="#9d7cd8" attributes={1}>
                        {item.provider}
                      </text>
                    </box>
                  );
                }

                const isSelected = () => i() === selectedDisplayIndex();
                const isCurrent = () => item.model.id === props.currentModel;

                return (
                  <box
                    paddingLeft={isCurrent() ? 2 : isSearching() ? 2 : 4}
                    paddingRight={1}
                    backgroundColor={isSelected() ? "#fab283" : undefined}
                  >
                    <Show when={isCurrent()}>
                      <text fg={isSelected() ? "#1a1a2e" : "#fab283"}>
                        {symbols.active}{" "}
                      </text>
                    </Show>
                    <box flexGrow={1}>
                      <text
                        fg={isSelected() ? "#1a1a2e" : "#eeeeee"}
                        attributes={isSelected() ? 1 : 0}
                      >
                        {item.model.name}
                      </text>
                      <Show when={isSearching()}>
                        <text fg={isSelected() ? "#1a1a2e" : "#808080"}>
                          {" "}
                          {item.model.provider}
                        </text>
                      </Show>
                    </box>
                    <Show when={item.model.isPro}>
                      <text fg={isSelected() ? "#1a1a2e" : "#fbbf24"}>
                        {" "}
                        {symbols.star}
                      </text>
                    </Show>
                  </box>
                );
              }}
            </For>
          </scrollbox>
        </Show>

        {/* Help bar */}
        <box paddingLeft={4} paddingRight={2} paddingTop={1}>
          <text fg="#808080" attributes={1}>
            {"\u2191\u2193"}
          </text>
          <text fg="#808080"> navigate {symbols.bullet} </text>
          <text fg="#808080" attributes={1}>
            Enter
          </text>
          <text fg="#808080"> select {symbols.bullet} </text>
          <text fg="#808080" attributes={1}>
            Esc
          </text>
          <text fg="#808080"> cancel</text>
        </box>
      </Show>
    </box>
  );
}
