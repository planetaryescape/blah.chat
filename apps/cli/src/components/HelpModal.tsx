import { useKeyboard } from "@opentui/solid";
import { For } from "solid-js";
import { symbols } from "../lib/terminal.js";

interface HelpModalProps {
  context: "list" | "chat";
  onClose: () => void;
}

interface KeyBinding {
  key: string;
  description: string;
}

const commonBindings: KeyBinding[] = [
  { key: "q", description: "Quit" },
  { key: "?", description: "Toggle help" },
];

const listBindings: KeyBinding[] = [
  { key: "j / \u2193", description: "Move down" },
  { key: "k / \u2191", description: "Move up" },
  { key: "g", description: "Go to top" },
  { key: "G", description: "Go to bottom" },
  { key: "Ctrl+D", description: "Half-page down" },
  { key: "Ctrl+U", description: "Half-page up" },
  { key: "Enter", description: "Open conversation" },
  { key: "n", description: "New conversation" },
  { key: "/", description: "Search conversations" },
  { key: "a", description: "Archive selected" },
  { key: "d", description: "Delete selected" },
];

const chatBindings: KeyBinding[] = [
  { key: "Enter", description: "Send message" },
  { key: "Ctrl+C", description: "Cancel input" },
  { key: "Esc", description: "Enter command mode" },
  { key: "j / k / \u2191 / \u2193", description: "Navigate messages" },
  { key: "g / G", description: "Jump to first/last message" },
  { key: "c", description: "Copy selected message" },
  { key: "B", description: "Bookmark selected message" },
  { key: "b", description: "Back to list" },
  { key: "m", description: "Change model" },
];

export function HelpModal(props: HelpModalProps) {
  useKeyboard((evt) => {
    evt.preventDefault();
    props.onClose();
  });

  const contextBindings = () =>
    props.context === "list" ? listBindings : chatBindings;
  const contextTitle = () =>
    props.context === "list" ? "Conversation List" : "Chat View";

  return (
    <box flexDirection="column" padding={1}>
      {/* Header */}
      <box
        marginBottom={1}
        style={{ border: true, borderColor: "cyan" }}
        paddingLeft={2}
        paddingRight={2}
      >
        <text fg="cyan" attributes={1}>
          {symbols.info} Keyboard Shortcuts
        </text>
      </box>

      {/* Context bindings */}
      <box marginBottom={1} flexDirection="column">
        <box marginBottom={1}>
          <text attributes={1}>{contextTitle()}</text>
        </box>
        <For each={contextBindings()}>
          {(binding) => (
            <box paddingLeft={1}>
              <box width={12}>
                <text fg="yellow" attributes={1}>
                  {binding.key}
                </text>
              </box>
              <text>{binding.description}</text>
            </box>
          )}
        </For>
      </box>

      {/* Common bindings */}
      <box marginBottom={1} flexDirection="column">
        <box marginBottom={1}>
          <text attributes={1}>General</text>
        </box>
        <For each={commonBindings}>
          {(binding) => (
            <box paddingLeft={1}>
              <box width={12}>
                <text fg="yellow" attributes={1}>
                  {binding.key}
                </text>
              </box>
              <text>{binding.description}</text>
            </box>
          )}
        </For>
      </box>

      {/* Footer */}
      <box marginTop={1} justifyContent="center">
        <text fg="gray">Press any key to close</text>
      </box>
    </box>
  );
}
