import { useKeyboard } from "@opentui/solid";
import { Show } from "solid-js";
import { Spinner } from "./Spinner.js";

interface ChatInputProps {
  onSubmit: (content: string) => void;
  value: string;
  onChange: (content: string) => void;
  onCancel?: () => void;
  onModelCommand?: () => void;
  onHelpCommand?: () => void;
  isDisabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

export function ChatInput(props: ChatInputProps) {
  let inputRef: any;

  useKeyboard((evt) => {
    if (props.isDisabled || props.isSending) return;

    if (evt.name === "escape" && props.onCancel) {
      evt.preventDefault();
      props.onCancel();
    }
  });

  const handleInput = (text: string) => {
    props.onChange(text);
  };

  const handleSubmit = () => {
    const trimmed = props.value.trim();
    if (trimmed === "/model") {
      props.onChange("");
      props.onModelCommand?.();
      return;
    }
    if (trimmed === "/help") {
      props.onChange("");
      props.onHelpCommand?.();
      return;
    }
    if (trimmed && !props.isSending) {
      props.onSubmit(trimmed);
      props.onChange("");
    }
  };

  const borderColor = () => {
    if (props.isSending) return "#fbbf24";
    if (props.isDisabled) return "#a1a1aa";
    return "#60a5fa";
  };

  return (
    <box
      paddingLeft={2}
      paddingTop={1}
      paddingBottom={1}
      style={{
        border: ["left"] as any,
        borderStyle: "heavy",
        borderColor: borderColor(),
      }}
    >
      <Show
        when={!props.isSending}
        fallback={<Spinner color="yellow" label="Sending..." />}
      >
        <Show
          when={!props.isDisabled}
          fallback={
            <text fg="#a1a1aa">{props.placeholder ?? "Type a message..."}</text>
          }
        >
          <input
            ref={(r: any) => {
              inputRef = r;
              setTimeout(() => {
                if (inputRef && !inputRef.isDestroyed) inputRef.focus();
              }, 1);
            }}
            value={props.value}
            onInput={handleInput}
            onSubmit={handleSubmit}
            placeholder={props.placeholder ?? "Type a message..."}
          />
        </Show>
      </Show>
    </box>
  );
}
