import { createSignal, onCleanup } from "solid-js";
import { defaultSpinner, timing } from "../lib/terminal.js";

interface SpinnerProps {
  label?: string;
  color?: string;
}

export function Spinner(props: SpinnerProps) {
  const [frame, setFrame] = createSignal(0);

  const timer = setInterval(() => {
    setFrame((f) => (f + 1) % defaultSpinner.length);
  }, timing.spinnerInterval);

  onCleanup(() => clearInterval(timer));

  return (
    <box flexDirection="row">
      <text fg={props.color ?? "cyan"}>{defaultSpinner[frame()]}</text>
      {props.label && <text> {props.label}</text>}
    </box>
  );
}
