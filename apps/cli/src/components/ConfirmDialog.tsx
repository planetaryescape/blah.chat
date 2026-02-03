import { useKeyboard } from "@opentui/solid";
import { symbols } from "../lib/terminal.js";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  useKeyboard((evt) => {
    if (evt.name === "y") {
      evt.preventDefault();
      props.onConfirm();
      return;
    }

    if (evt.name === "return") {
      evt.preventDefault();
      props.onConfirm();
      return;
    }

    if (evt.name === "n" || evt.name === "escape" || evt.name === "q") {
      evt.preventDefault();
      props.onCancel();
      return;
    }
  });

  const confirmColor = () => (props.isDestructive ? "red" : "green");
  const borderColor = () => (props.isDestructive ? "red" : "cyan");
  const icon = () => (props.isDestructive ? symbols.warning : symbols.info);

  return (
    <box flexDirection="column" padding={1}>
      {/* Title */}
      <box
        marginBottom={1}
        style={{ border: true, borderColor: borderColor() }}
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg={borderColor()} attributes={1}>
          {icon()} {props.title}
        </text>
      </box>

      {/* Message */}
      <box paddingLeft={1} marginBottom={1}>
        <text>{props.message}</text>
      </box>

      {/* Actions */}
      <box paddingLeft={1} gap={2}>
        <box>
          <text fg={confirmColor()} attributes={1}>
            [y]
          </text>
          <text fg={confirmColor()}> {props.confirmLabel ?? "Confirm"}</text>
        </box>
        <box>
          <text fg="gray" attributes={1}>
            [n]
          </text>
          <text fg="gray"> {props.cancelLabel ?? "Cancel"}</text>
        </box>
      </box>

      {/* Help */}
      <box marginTop={1} paddingLeft={1}>
        <text fg="gray">Press y/Enter to confirm, n/Esc to cancel</text>
      </box>
    </box>
  );
}
