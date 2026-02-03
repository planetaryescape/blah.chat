import { useKeyboard } from "@opentui/solid";
import { createSignal } from "solid-js";
import { symbols } from "../lib/terminal.js";
import { Spinner } from "./Spinner.js";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isDisabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

export function ChatInput(props: ChatInputProps) {
  const [value, setValue] = createSignal("");
  let inputRef: any;

  useKeyboard((evt) => {
    if (props.isDisabled || props.isSending) return;

    if (evt.name === "escape" && props.onCancel) {
      evt.preventDefault();
      props.onCancel();
    }
  });

  const handleInput = (text: string) => {
    setValue(text);
  };

  const handleSubmit = () => {
    const trimmed = value().trim();
    if (trimmed && !props.isSending) {
      props.onSubmit(trimmed);
      setValue("");
    }
  };

  // Sending state
  if (props.isSending) {
    return (
      <box
        style={{ border: true, borderColor: "yellow" }}
        paddingLeft={1}
        paddingRight={1}
      >
        <Spinner color="yellow" label="Sending..." />
      </box>
    );
  }

  // Disabled state
  if (props.isDisabled) {
    return (
      <box
        style={{ border: true, borderColor: "gray" }}
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg="gray">{props.placeholder ?? "Type a message..."}</text>
      </box>
    );
  }

  return (
    <box flexDirection="column">
      <box
        style={{ border: true, borderColor: "cyan" }}
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg="cyan">{symbols.chevronRight} </text>
        <input
          ref={(r: any) => {
            inputRef = r;
            setTimeout(() => {
              if (inputRef && !inputRef.isDestroyed) inputRef.focus();
            }, 1);
          }}
          onInput={handleInput}
          onSubmit={handleSubmit}
          placeholder={props.placeholder ?? "Type a message..."}
        />
      </box>
      <box paddingLeft={1}>
        <text fg="gray">Enter send | Esc cancel | Ctrl+C quit</text>
      </box>
    </box>
  );
}
